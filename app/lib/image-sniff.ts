// Picture checks that do not trust the browser: the real type comes from the first bytes of the file,
// and the metadata (GPS position, camera, comments) is cut out before the file is stored.
// The code walks the JPEG markers, PNG chunks, and WebP chunks. It never decodes pixels, so it is cheap.
export type ImageType = "jpeg" | "png" | "webp";

export const CONTENT_TYPE: Record<ImageType, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
export const EXT: Record<ImageType, string> = { jpeg: "jpg", png: "png", webp: "webp" };

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));
const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

/** The real type of a file, from its magic bytes. Null when it is not one of the three. */
export function sniffImage(b: Uint8Array): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "png";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  return null;
}

// ---------- JPEG ----------

/** Reads the Orientation tag (1 to 8) from the payload of an EXIF APP1 segment. Null when there is none. */
function exifOrientation(p: Uint8Array): number | null {
  if (p.length < 14 || ascii(p, 0, 4) !== "Exif") return null;
  const t = 6; // the TIFF header starts after "Exif\0\0"
  const little = p[t] === 0x49 && p[t + 1] === 0x49;
  if (!little && !(p[t] === 0x4d && p[t + 1] === 0x4d)) return null;
  const u16 = (at: number) => (at + 2 <= p.length ? (little ? p[at] | (p[at + 1] << 8) : (p[at] << 8) | p[at + 1]) : -1);
  const u32 = (at: number) => (at + 4 <= p.length ? (little ? (p[at] | (p[at + 1] << 8) | (p[at + 2] << 16) | (p[at + 3] << 24)) >>> 0 : ((p[at] << 24) | (p[at + 1] << 16) | (p[at + 2] << 8) | p[at + 3]) >>> 0) : -1);
  const ifd = t + u32(t + 4);
  const count = u16(ifd);
  if (count < 0 || count > 200) return null;
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (u16(e) === 0x0112 && u16(e + 2) === 3) {
      const v = u16(e + 8);
      return v >= 1 && v <= 8 ? v : null;
    }
  }
  return null;
}

/** A new, tiny EXIF segment that holds only the orientation. */
const orientationSegment = (o: number): Uint8Array =>
  Uint8Array.from([
    0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, // marker, length 34, "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, // TIFF header, big endian, first IFD at 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, 0, o, 0, 0, // Orientation, SHORT, count 1
    0, 0, 0, 0, // no next IFD
  ]);

function cleanJpeg(b: Uint8Array): Uint8Array | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const kept: Uint8Array[] = [b.subarray(0, 2)]; // the start-of-image marker
  let orientation: number | null = null;
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) return null;
    let m = i + 1;
    while (m < b.length && b[m] === 0xff) m++; // fill bytes
    if (m >= b.length) return null;
    const marker = b[m];
    const start = m - 1;
    if (marker === 0xda || marker === 0xd9) {
      kept.push(b.subarray(start)); // the scan data and the end of the picture are copied as they are
      const body = concat(kept);
      const head = body.subarray(0, 2);
      const rest = body.subarray(2);
      return orientation !== null && orientation > 1 ? concat([head, orientationSegment(orientation), rest]) : body;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { kept.push(b.subarray(start, m + 1)); i = m + 1; continue; }
    if (m + 2 >= b.length) return null;
    const len = (b[m + 1] << 8) | b[m + 2];
    if (len < 2 || m + 1 + len > b.length) return null;
    const seg = b.subarray(start, m + 1 + len);
    if (marker === 0xe1) orientation = exifOrientation(seg.subarray(4)) ?? orientation; // APP1: EXIF and XMP
    else if (marker === 0xed || marker === 0xfe) { /* APP13 (IPTC) and comments: dropped */ }
    else kept.push(seg);
    i = m + 1 + len;
  }
  return null; // no scan data: a damaged file
}

// ---------- PNG ----------

const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function cleanPng(b: Uint8Array): Uint8Array | null {
  const kept: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  let ended = false;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (end > b.length) return null;
    if (!PNG_DROP.has(type)) kept.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") { ended = true; break; }
  }
  return ended ? concat(kept) : null;
}

// ---------- WebP ----------

function cleanWebp(b: Uint8Array): Uint8Array | null {
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > b.length) return null;
    const chunk = b.slice(i, Math.min(end, b.length));
    if (type === "VP8X" && len >= 1) chunk[8] &= ~0x0c; // the EXIF flag (0x08) and the XMP flag (0x04) go off
    if (type !== "EXIF" && type !== "XMP ") chunks.push(chunk);
    i = end;
  }
  if (!chunks.length) return null;
  const body = concat(chunks);
  const size = body.length + 4;
  return concat([Uint8Array.from([0x52, 0x49, 0x46, 0x46, size & 255, (size >> 8) & 255, (size >> 16) & 255, (size >>> 24) & 255, 0x57, 0x45, 0x42, 0x50]), body]);
}

/** The picture without its metadata, or null when the file is damaged. */
export function cleanImage(b: Uint8Array, type: ImageType): Uint8Array | null {
  return type === "jpeg" ? cleanJpeg(b) : type === "png" ? cleanPng(b) : cleanWebp(b);
}

export type PreparedImage = { type: ImageType; ext: string; contentType: string; bytes: Uint8Array };

/** The one door for every upload: real type from the bytes, metadata removed. Null means refuse the file. */
export function prepareImage(b: Uint8Array): PreparedImage | null {
  const type = sniffImage(b);
  if (!type) return null;
  const bytes = cleanImage(b, type);
  return bytes ? { type, ext: EXT[type], contentType: CONTENT_TYPE[type], bytes } : null;
}
