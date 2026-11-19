// The pure parts of sending mail over SMTP: the message text and the checks. The socket code is in app/lib/.server/smtp.ts.
const enc = new TextEncoder();

export const toBase64 = (s: string): string => {
  const bytes = enc.encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

/** An address with no spaces, quotes, commas or angle brackets. This also blocks line breaks, so a header cannot be injected. */
export const isPlainAddress = (a: string): boolean => /^[^\s<>"',;()[\]\\]+@[^\s<>"',;()[\]\\]+\.[^\s<>"',;()[\]\\]+$/.test(a) && a.length <= 254;

/** A header value with no line break. Anything a caller passes in is cleaned, never trusted. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

/** Lines that start with a dot get a second dot, so the body cannot end the SMTP message early. */
export const dotStuff = (s: string): string => s.replace(/^\./gm, "..");

const wrap76 = (b64: string) => b64.match(/.{1,76}/g)?.join("\r\n") ?? "";

export function buildMessage(m: { fromName: string; fromAddress: string; to: string; subject: string; text: string; date: Date; id: string }): string {
  if (!isPlainAddress(m.fromAddress) || !isPlainAddress(m.to)) throw new Error("Bad email address");
  const headers = [
    `From: =?UTF-8?B?${toBase64(oneLine(m.fromName))}?= <${m.fromAddress}>`,
    `To: <${m.to}>`,
    `Subject: =?UTF-8?B?${toBase64(oneLine(m.subject))}?=`,
    `Date: ${m.date.toUTCString()}`,
    `Message-ID: <${m.id}@${m.fromAddress.split("@")[1]}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  // Base64 has no dots at the start of a line, but the stuffing stays as a second guard.
  return dotStuff(`${headers.join("\r\n")}\r\n\r\n${wrap76(toBase64(m.text.replace(/\r?\n/g, "\r\n")))}`);
}
