import { describe, expect, it } from "vitest";
import { cleanImage, prepareImage, sniffImage } from "@/lib/image-sniff";

// ---- byte builders for small fake files. The cleaner walks markers and chunks; it never decodes pixels. ----
const bytes = (...parts: (number[] | Uint8Array | string)[]): Uint8Array => {
  const out: number[] = [];
  for (const p of parts) out.push(...(typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p));
  return Uint8Array.from(out);
};
const u16 = (n: number) => [(n >> 8) & 255, n & 255];
const u32 = (n: number) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const find = (hay: Uint8Array, needle: number[] | string): number => {
  const n = typeof needle === "string" ? [...needle].map((c) => c.charCodeAt(0)) : needle;
  outer: for (let i = 0; i + n.length <= hay.length; i++) {
    for (let j = 0; j < n.length; j++) if (hay[i + j] !== n[j]) continue outer;
    return i;
  }
  return -1;
};
const has = (hay: Uint8Array, needle: number[] | string) => find(hay, needle) >= 0;

/** An EXIF APP1 segment (big-endian) with Orientation and a GPS pointer, like a phone photo. */
function exifApp1(orientation: number, withGps: boolean): number[] {
  const entries: number[][] = [[0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, 0, orientation, 0, 0]];
  if (withGps) entries.push([0x88, 0x25, 0x00, 0x04, 0, 0, 0, 1, ...u32(0x30)]); // GPS IFD pointer (tag 0x8825)
  const ifd0 = [...u16(entries.length), ...entries.flat(), ...u32(0)];
  const gps = withGps ? [...u16(1), 0x00, 0x01, 0x00, 0x02, 0, 0, 0, 2, 0x4e, 0, 0, 0, ...u32(0)] : []; // GPSLatitudeRef = "N"
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, ...u32(8), ...ifd0, ...new Array(Math.max(0, 0x30 - 8 - ifd0.length)).fill(0), ...gps];
  const payload = [...[..."Exif"].map((c) => c.charCodeAt(0)), 0, 0, ...tiff];
  return [0xff, 0xe1, ...u16(payload.length + 2), ...payload];
}
const app0 = [0xff, 0xe0, ...u16(16), 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
const com = (text: string) => [0xff, 0xfe, ...u16(text.length + 2), ...[...text].map((c) => c.charCodeAt(0))];
const sos = [0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0x56, 0xff, 0xd9];
const jpeg = (...segments: number[][]) => bytes([0xff, 0xd8], ...segments, sos);

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const pngChunk = (type: string, data: number[]) => [...u32(data.length), ...[...type].map((c) => c.charCodeAt(0)), ...data, 1, 2, 3, 4];

const webpChunk = (type: string, data: number[]) => [...[...type].map((c) => c.charCodeAt(0)), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : [])];
const webp = (...chunks: number[][]) => {
  const body = [...[..."WEBP"].map((c) => c.charCodeAt(0)), ...chunks.flat()];
  return bytes("RIFF", le32(body.length), body);
};

describe("sniffImage", () => {
  it("knows the three picture types by their first bytes", () => {
    expect(sniffImage(jpeg(app0))).toBe("jpeg");
    expect(sniffImage(bytes(PNG_SIG, pngChunk("IEND", [])))).toBe("png");
    expect(sniffImage(webp(webpChunk("VP8 ", [1, 2, 3])))).toBe("webp");
  });
  it("refuses a file that only claims to be a picture", () => {
    expect(sniffImage(bytes("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniffImage(bytes("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImage(bytes("GIF89a"))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
    expect(sniffImage(bytes("RIFF", le32(4), "WAVE"))).toBeNull();
  });
});

describe("cleanImage: JPEG", () => {
  it("removes the GPS data and the comment, and keeps the picture data", () => {
    const input = jpeg(app0, exifApp1(1, true), com("secret comment"));
    expect(has(input, [0x88, 0x25])).toBe(true); // the sample has the GPS pointer
    const out = cleanImage(input, "jpeg")!;
    expect(out).not.toBeNull();
    expect(has(out, [0x88, 0x25])).toBe(false);
    expect(has(out, "Exif")).toBe(false);
    expect(has(out, "secret comment")).toBe(false);
    expect(has(out, "JFIF")).toBe(true);
    expect(find(out, sos)).toBeGreaterThan(0); // the scan data is copied as it was
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xd8);
  });
  it("keeps the orientation, so a phone photo does not turn sideways", () => {
    for (const o of [3, 6, 8]) {
      const out = cleanImage(jpeg(app0, exifApp1(o, true)), "jpeg")!;
      const at = find(out, [0x01, 0x12, 0x00, 0x03]);
      expect(at).toBeGreaterThan(0);
      expect(out[at + 9]).toBe(o);
      expect(has(out, [0x88, 0x25])).toBe(false); // and still no GPS
    }
  });
  it("drops the whole EXIF block when the orientation is normal", () => {
    const out = cleanImage(jpeg(app0, exifApp1(1, true)), "jpeg")!;
    expect(has(out, "Exif")).toBe(false);
  });
  it("leaves a clean file as it was", () => {
    const input = jpeg(app0);
    expect(cleanImage(input, "jpeg")).toEqual(input);
  });
  it("returns null for a damaged file", () => {
    expect(cleanImage(bytes([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2, 3]), "jpeg")).toBeNull(); // a segment longer than the file
    expect(cleanImage(bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0]), "jpeg")).toBeNull(); // no scan data
    expect(cleanImage(bytes([0xff, 0xd8]), "jpeg")).toBeNull();
  });
});

describe("cleanImage: PNG", () => {
  it("removes text and EXIF chunks and keeps the picture chunks in order", () => {
    const input = bytes(PNG_SIG, pngChunk("IHDR", new Array(13).fill(0)), pngChunk("tEXt", [..."Comment\0secret gps"].map((c) => c.charCodeAt(0))), pngChunk("eXIf", [1, 2, 3]), pngChunk("IDAT", [9, 9]), pngChunk("IEND", []));
    const out = cleanImage(input, "png")!;
    expect(has(out, "secret gps")).toBe(false);
    expect(has(out, "tEXt")).toBe(false);
    expect(has(out, "eXIf")).toBe(false);
    const order = ["IHDR", "IDAT", "IEND"].map((t) => find(out, t));
    expect(order.every((n) => n > 0)).toBe(true);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });
  it("returns null when the chunks run past the end of the file", () => {
    expect(cleanImage(bytes(PNG_SIG, u32(9999), "IDAT", [1, 2]), "png")).toBeNull();
  });
});

describe("cleanImage: WebP", () => {
  const vp8x = (flags: number) => webpChunk("VP8X", [flags, 0, 0, 0, 9, 0, 0, 9, 0, 0]);
  it("removes the EXIF and XMP chunks, clears their flags, and fixes the size", () => {
    const input = webp(vp8x(0x1c), webpChunk("VP8L", [1, 2, 3]), webpChunk("EXIF", [..."secret gps!"].map((c) => c.charCodeAt(0))), webpChunk("XMP ", [..."<x/>"].map((c) => c.charCodeAt(0))));
    const out = cleanImage(input, "webp")!;
    expect(has(out, "EXIF")).toBe(false);
    expect(has(out, "XMP ")).toBe(false);
    expect(has(out, "secret gps")).toBe(false);
    const x = find(out, "VP8X");
    expect(out[x + 8] & 0x0c).toBe(0); // the EXIF (0x08) and XMP (0x04) flags are off
    expect(out[x + 8] & 0x10).toBe(0x10); // the alpha flag (0x10) stays
    const riffSize = out[4] | (out[5] << 8) | (out[6] << 16) | (out[7] << 24);
    expect(riffSize).toBe(out.length - 8);
    expect(has(out, "VP8L")).toBe(true);
  });
  it("returns null for a chunk longer than the file", () => {
    expect(cleanImage(bytes("RIFF", le32(20), "WEBP", "VP8 ", le32(9999), [1, 2]), "webp")).toBeNull();
  });
});

describe("prepareImage", () => {
  it("uses the real type, not the one the browser claims", () => {
    const png = bytes(PNG_SIG, pngChunk("IHDR", new Array(13).fill(0)), pngChunk("IEND", []));
    const r = prepareImage(png)!;
    expect(r.contentType).toBe("image/png");
    expect(r.ext).toBe("png");
  });
  it("refuses text and damaged files", () => {
    expect(prepareImage(bytes("<script>alert(1)</script>"))).toBeNull();
    expect(prepareImage(bytes([0xff, 0xd8, 0xff]))).toBeNull(); // right start, nothing inside
  });
  it("returns a cleaned picture", () => {
    const r = prepareImage(jpeg(app0, exifApp1(6, true)))!;
    expect(r.contentType).toBe("image/jpeg");
    expect(has(r.bytes, [0x88, 0x25])).toBe(false);
  });
});
