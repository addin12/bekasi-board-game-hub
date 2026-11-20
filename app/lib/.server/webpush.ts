// Web Push from the Worker itself: the message is encrypted (RFC 8291, aes128gcm) and signed (VAPID, RFC 8292) with the platform's WebCrypto, no library.
// Ported from the Cashflow Worker (src/webpush.js), where the encryption is checked against the RFC's own example.
import { z } from "zod";

const text = new TextEncoder();
type Bytes = Uint8Array<ArrayBuffer>;

/** The push services of the browsers. A stored endpoint anywhere else is never called, so a member cannot make the Worker fetch any address. */
const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//i;
export const allowedEndpoint = (e: unknown): e is string => typeof e === "string" && e.length <= 1000 && PUSH_HOSTS.test(e);

export const b64u = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = (s: string): Bytes => {
  const t = String(s).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(t + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const cat = (...parts: Uint8Array[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

const hkdf = async (ikm: Bytes, salt: Bytes, info: Bytes, bytes: number): Promise<Bytes> =>
  new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), bytes * 8));

const b64urlText = z.string().regex(/^[A-Za-z0-9_-]+$/);

/** What the browser's `PushSubscription.toJSON()` gives. The browser is not trusted: every field is checked. */
export const subscriptionSchema = z.object({
  endpoint: z.string().refine(allowedEndpoint, "Not a known push service"),
  keys: z.object({ p256dh: b64urlText.max(200), auth: b64urlText.max(100) }),
});


export type PushKeys = { p256dh: string; auth: string };

/**
 * The body of the push request: salt, record size, sender key, then the encrypted message. `ephemeral` (a key pair) and `salt` exist only for tests
 * (the RFC's own example). In use, both are fresh every time.
 */
export async function encrypt(message: string, { p256dh, auth }: PushKeys, opts: { ephemeral?: CryptoKeyPair; salt?: Bytes } = {}): Promise<Bytes> {
  const phone = unb64u(p256dh);
  const pair = opts.ephemeral ?? (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]));
  const mine = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const theirs = await crypto.subtle.importKey("raw", phone, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: theirs }, pair.privateKey, 256));
  const ikm = await hkdf(shared, unb64u(auth), cat(text.encode("WebPush: info\0"), phone, mine), 32);
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", await hkdf(ikm, salt, text.encode("Content-Encoding: aes128gcm\0"), 16), "AES-GCM", false, ["encrypt"]);
  const iv = await hkdf(ikm, salt, text.encode("Content-Encoding: nonce\0"), 12);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, cat(text.encode(message), new Uint8Array([2])))); // 2 = the last (only) record
  return cat(salt, new Uint8Array([0, 0, 0x10, 0, mine.length]), mine, sealed); // record size 4096
}

export type Vapid = { subject: string; publicKey: string; privateKey: string };

/** The Authorization header that proves the message comes from the holder of the app's key. */
export async function vapidHeader(endpoint: string, { subject, publicKey, privateKey }: Vapid, nowMs = Date.now()): Promise<string> {
  const pub = unb64u(publicKey);
  const key = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33)), d: privateKey }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const part = (o: object) => b64u(text.encode(JSON.stringify(o)));
  const unsigned = `${part({ typ: "JWT", alg: "ES256" })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(nowMs / 1000) + 12 * 3600, sub: subject })}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, text.encode(unsigned)));
  return `vapid t=${unsigned}.${b64u(signature)}, k=${publicKey}`;
}

export type Notice = { title: string; body: string; tag?: string; url?: string };
const cut = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
/** What the service worker receives: title, body, tag and a path inside this site. */
export const payloadOf = (n: Notice): string => {
  const url = cut(n.url, 200);
  return JSON.stringify({ title: cut(n.title, 100), body: cut(n.body, 500), tag: cut(n.tag, 40), url: /^\/(?!\/)/.test(url) ? url : "/" });
};

/** Sends one notice to one device. The answer is the push service's HTTP status (0: not sent). 404 and 410 mean the device is gone. */
export async function sendOne(
  sub: { endpoint: string; p256dh: string; auth: string },
  notice: Notice,
  vapid: Vapid,
  { fetchImpl = fetch, now = Date.now }: { fetchImpl?: typeof fetch; now?: () => number } = {},
): Promise<number> {
  if (!allowedEndpoint(sub.endpoint) || !sub.p256dh || !sub.auth) return 0;
  try {
    const res = await fetchImpl(sub.endpoint, {
      method: "POST",
      headers: { authorization: await vapidHeader(sub.endpoint, vapid, now()), "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: "86400" },
      body: (await encrypt(payloadOf(notice), sub)) as BodyInit,
    });
    return res.status;
  } catch {
    return 0;
  }
}
