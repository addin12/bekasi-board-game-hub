/// <reference types="node" />
import { createDecipheriv, createECDH, createPublicKey, createVerify, hkdfSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isStyle, QUESTIONS, scoreQuiz, STYLE_CODES } from "@/lib/play-style";
import { buildMessage, dotStuff, isPlainAddress, toBase64 } from "@/lib/smtp-message";
import { allowedEndpoint, b64u, encrypt, payloadOf, sendOne, subscriptionSchema, unb64u, vapidHeader } from "@/lib/.server/webpush";

// ---- play-style quiz ----

describe("scoreQuiz", () => {
  const all = (style: (typeof STYLE_CODES)[number]) => QUESTIONS.map((q) => q.answers.findIndex((a) => a.style === style));

  it("gives each style when every answer votes for it", () => {
    for (const s of STYLE_CODES) expect(scoreQuiz(all(s))).toBe(s);
  });
  it("picks the style with the most votes", () => {
    const picks = all("strategist");
    picks[0] = QUESTIONS[0].answers.findIndex((a) => a.style === "competitor");
    picks[1] = QUESTIONS[1].answers.findIndex((a) => a.style === "competitor");
    expect(scoreQuiz(picks)).toBe("strategist"); // 4 against 2
  });
  it("breaks a tie for the style that got a vote first", () => {
    const picks = QUESTIONS.map((q, i) => q.answers.findIndex((a) => a.style === (i < 3 ? "socializer" : "storyteller")));
    expect(scoreQuiz(picks)).toBe("socializer");
  });
  it("refuses anything that is not a full, valid set of picks", () => {
    expect(scoreQuiz(null)).toBeNull();
    expect(scoreQuiz([0, 0, 0])).toBeNull();
    expect(scoreQuiz([...all("strategist").slice(0, 5), 99])).toBeNull();
    expect(scoreQuiz([...all("strategist").slice(0, 5), -1])).toBeNull();
    expect(scoreQuiz([...all("strategist").slice(0, 5), NaN])).toBeNull();
    expect(scoreQuiz([...all("strategist").slice(0, 5), "1"])).toBeNull();
  });
  it("has one answer for every style in every question", () => {
    for (const q of QUESTIONS) expect(new Set(q.answers.map((a) => a.style))).toEqual(new Set(STYLE_CODES));
  });
  it("knows which codes are styles", () => {
    expect(isStyle("strategist")).toBe(true);
    expect(isStyle("wizard")).toBe(false);
    expect(isStyle(null)).toBe(false);
  });
});

// ---- web push (RFC 8291 example, checked against Node's own crypto) ----

const RFC = {
  plaintext: "When I grow up, I want to be a watermelon",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

const importPair = async (priv: string, pub: string): Promise<CryptoKeyPair> => {
  const raw = unb64u(pub);
  const jwk = { kty: "EC", crv: "P-256", x: b64u(raw.slice(1, 33)), y: b64u(raw.slice(33)), d: priv };
  return {
    privateKey: await crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]),
    publicKey: await crypto.subtle.importKey("raw", raw, { name: "ECDH", namedCurve: "P-256" }, true, []),
  };
};

const newPhone = () => {
  const e = createECDH("prime256v1");
  e.generateKeys();
  return e;
};

describe("encrypt", () => {
  it("gives the exact bytes of the RFC 8291 example", async () => {
    const body = await encrypt(RFC.plaintext, { p256dh: RFC.uaPublic, auth: RFC.auth }, { ephemeral: await importPair(RFC.asPrivate, RFC.asPublic), salt: unb64u(RFC.salt) });
    expect(b64u(body)).toBe(RFC.body);
  });
  it("can be opened by the phone and differs every time", async () => {
    const phone = newPhone();
    const auth = Buffer.from("0123456789abcdef");
    const sub = { p256dh: b64u(phone.getPublicKey()), auth: b64u(auth) };
    const a = Buffer.from(await encrypt("hello, hub", sub));
    const b = Buffer.from(await encrypt("hello, hub", sub));
    expect(a.equals(b)).toBe(false);
    const salt = a.subarray(0, 16);
    const senderPublic = a.subarray(21, 21 + a[20]);
    const sealed = a.subarray(21 + a[20]);
    const ikm = Buffer.from(hkdfSync("sha256", phone.computeSecret(senderPublic), auth, Buffer.concat([Buffer.from("WebPush: info\0"), phone.getPublicKey(), senderPublic]), 32));
    const cek = Buffer.from(hkdfSync("sha256", ikm, salt, "Content-Encoding: aes128gcm\0", 16));
    const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, "Content-Encoding: nonce\0", 12));
    const d = createDecipheriv("aes-128-gcm", cek, nonce);
    d.setAuthTag(sealed.subarray(sealed.length - 16));
    const plain = Buffer.concat([d.update(sealed.subarray(0, sealed.length - 16)), d.final()]);
    expect(plain.toString()).toBe("hello, hub\u0002"); // the message and the "last record" marker
  });
});

describe("vapidHeader", () => {
  it("is a signed token for the push service address that the public key verifies", async () => {
    const ec = newPhone();
    const publicKey = b64u(ec.getPublicKey());
    const header = await vapidHeader("https://fcm.googleapis.com/fcm/send/abc", { subject: "https://site.example", publicKey, privateKey: b64u(ec.getPrivateKey()) }, 1_000_000);
    const m = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    expect(m[2]).toBe(publicKey);
    const [h, c, sig] = m[1].split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ typ: "JWT", alg: "ES256" });
    expect(JSON.parse(Buffer.from(c, "base64url").toString())).toEqual({ aud: "https://fcm.googleapis.com", exp: 1000 + 12 * 3600, sub: "https://site.example" });
    const pub = createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64u(ec.getPublicKey().subarray(1, 33)), y: b64u(ec.getPublicKey().subarray(33)) }, format: "jwk" });
    expect(createVerify("SHA256").update(`${h}.${c}`).verify({ key: pub, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"))).toBe(true);
  });
});

describe("sendOne", () => {
  const vapid = () => {
    const ec = newPhone();
    return { subject: "https://site.example", publicKey: b64u(ec.getPublicKey()), privateKey: b64u(ec.getPrivateKey()) };
  };
  const device = (endpoint = "https://fcm.googleapis.com/fcm/send/xyz") => ({ endpoint, p256dh: b64u(newPhone().getPublicKey()), auth: b64u(Buffer.from("0123456789abcdef")) });

  it("posts the encrypted notice to the push service and returns its status", async () => {
    let seen: { url: unknown; init: RequestInit } | undefined;
    const status = await sendOne(device(), { title: "T", body: "B" }, vapid(), { fetchImpl: (async (url: unknown, init: RequestInit) => { seen = { url, init }; return new Response("", { status: 201 }); }) as typeof fetch });
    expect(status).toBe(201);
    expect(seen?.url).toBe("https://fcm.googleapis.com/fcm/send/xyz");
    expect((seen?.init.headers as Record<string, string>)["content-encoding"]).toBe("aes128gcm");
    expect((seen?.init.body as Uint8Array).length).toBeGreaterThan(80);
  });
  it("hands back 410 so the device can be dropped, and 0 when the push service is down", async () => {
    expect(await sendOne(device(), { title: "T", body: "" }, vapid(), { fetchImpl: (async () => new Response("", { status: 410 })) as typeof fetch })).toBe(410);
    expect(await sendOne(device(), { title: "T", body: "" }, vapid(), { fetchImpl: (async () => { throw new Error("down"); }) as typeof fetch })).toBe(0);
  });
  it("never calls an address that is not a browser push service", async () => {
    let called = false;
    const sub = device("https://evil.example/fcm.googleapis.com/");
    expect(allowedEndpoint(sub.endpoint)).toBe(false);
    expect(await sendOne(sub, { title: "T", body: "" }, vapid(), { fetchImpl: (async () => { called = true; return new Response(""); }) as typeof fetch })).toBe(0);
    expect(called).toBe(false);
  });
});

describe("payloadOf", () => {
  it("cuts long texts and allows only a path inside this site", () => {
    const p = JSON.parse(payloadOf({ title: "t".repeat(300), body: "b".repeat(900), tag: "x".repeat(99), url: "https://evil.example/" }));
    expect([p.title.length, p.body.length, p.tag.length, p.url]).toEqual([100, 500, 40, "/"]);
    expect(JSON.parse(payloadOf({ title: "T", body: "", url: "/tables/abc" })).url).toBe("/tables/abc");
    expect(JSON.parse(payloadOf({ title: "T", body: "", url: "//evil.example" })).url).toBe("/");
  });
});

describe("subscriptionSchema", () => {
  const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BCVx_-abc", auth: "BTBZ_-xyz" } };
  it("accepts what a browser sends", () => expect(subscriptionSchema.safeParse(good).success).toBe(true));
  it("refuses a foreign endpoint, bad keys, and wrong shapes", () => {
    expect(subscriptionSchema.safeParse({ ...good, endpoint: "https://evil.example/x" }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ ...good, endpoint: "http://fcm.googleapis.com/x" }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ ...good, keys: { p256dh: "not base64!", auth: "ok" } }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ ...good, keys: { p256dh: "a".repeat(201), auth: "ok" } }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ endpoint: good.endpoint }).success).toBe(false);
    expect(subscriptionSchema.safeParse(null).success).toBe(false);
  });
});

// ---- mail message ----

describe("mail message", () => {
  const base = { fromName: "Bekasi Board Game Hub", fromAddress: "hub@example.com", to: "raka@example.com", subject: "123456 is your code", text: "Your sign-in code is 123456\n\nIt works for 10 minutes.", date: new Date("2026-11-19T10:00:00Z"), id: "abc" };

  it("builds headers with CRLF line ends and a base64 body that decodes to the text", () => {
    const msg = buildMessage(base);
    const [head, body] = msg.split("\r\n\r\n");
    expect(head).toContain("To: <raka@example.com>");
    expect(head).toContain("Date: Thu, 19 Nov 2026 10:00:00 GMT");
    expect(head).toContain("Content-Transfer-Encoding: base64");
    expect(Buffer.from(body.replace(/\r\n/g, ""), "base64").toString()).toBe("Your sign-in code is 123456\r\n\r\nIt works for 10 minutes.");
    expect(/(^|[^\r])\n/.test(msg)).toBe(false); // no bare line feed anywhere
  });
  it("encodes the subject so it can hold any text", () => {
    const msg = buildMessage({ ...base, subject: "Kode Anda: 123456 ✓" });
    const enc = /Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(msg)![1];
    expect(Buffer.from(enc, "base64").toString()).toBe("Kode Anda: 123456 ✓");
  });
  it("refuses an address that could inject a header", () => {
    expect(() => buildMessage({ ...base, to: "a@b.com\r\nBcc: x@y.com" })).toThrow();
    expect(() => buildMessage({ ...base, to: "a@b.com>, <x@y.com" })).toThrow();
    expect(isPlainAddress("raka@example.com")).toBe(true);
    expect(isPlainAddress("no-at-sign")).toBe(false);
    expect(isPlainAddress("a b@c.com")).toBe(false);
  });
  it("doubles a dot at the start of a line", () => {
    expect(dotStuff("a\r\n.b\r\n..c")).toBe("a\r\n..b\r\n...c");
  });
  it("encodes text as UTF-8 base64", () => {
    expect(toBase64("é")).toBe("w6k=");
  });
});
