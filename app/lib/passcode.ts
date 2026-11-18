// Member passcode: stored only as HMAC-SHA256(secret, code); compared in constant time.

const enc = new TextEncoder();

export const normalizePasscode = (code: string) => code.trim().toLowerCase();

export async function hashPasscode(secret: string, code: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(normalizePasscode(code)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const MAX_TRIES_PER_HOUR = 5;
