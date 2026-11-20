// End-to-end checks against a deployed site. Default target: the sandbox (it has fake members and the test sign-in code).
//   npm run e2e                      -> sandbox, all checks, then cleans up its own test data
//   E2E_BASE=https://real.example npm run e2e   -> only the checks that need no sign-in (public pages, headers, access control)
// Needs Google Chrome on this PC. The checks change sandbox data a little and delete it again.
import { execSync } from "node:child_process";
import { chromium, request as pwRequest } from "playwright";

const BASE = (process.env.E2E_BASE ?? "https://bekasi-board-game-hub-staging.bbgc.workers.dev").replace(/\/$/, "");
const SANDBOX = BASE.includes("-staging.");
const AXE = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
let pass = 0, fail = 0;
const check = (ok, name, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? ` -> ${detail}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const u16 = (n) => [(n >> 8) & 255, n & 255];
const u32 = (n) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
const text = (s) => [...s].map((c) => c.charCodeAt(0));
const has = (buf, needle) => Buffer.from(buf).includes(Buffer.from(needle));

/** A small fake JPEG with an EXIF block: orientation 6 and a GPS pointer, like a phone photo. */
function gpsJpeg() {
  const entries = [[0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, 0, 6, 0, 0], [0x88, 0x25, 0x00, 0x04, 0, 0, 0, 1, ...u32(0x30)]];
  const ifd0 = [...u16(2), ...entries.flat(), ...u32(0)];
  const gps = [...u16(1), 0x00, 0x01, 0x00, 0x02, 0, 0, 0, 2, 0x4e, 0, 0, 0, ...u32(0)];
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, ...u32(8), ...ifd0, ...new Array(0x30 - 8 - ifd0.length).fill(0), ...gps];
  const payload = [...text("Exif"), 0, 0, ...tiff];
  const app1 = [0xff, 0xe1, ...u16(payload.length + 2), ...payload];
  const app0 = [0xff, 0xe0, ...u16(16), ...text("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  return Buffer.from([0xff, 0xd8, ...app0, ...app1, 0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0x56, 0xff, 0xd9]);
}

async function login(browser, email, viewport = { width: 1000, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.request.post(`${BASE}/api/auth/email-otp/send-verification-otp`, { data: { email, type: "sign-in" }, headers: { origin: BASE } });
  const r = await ctx.request.post(`${BASE}/api/auth/sign-in/email-otp`, { data: { email, otp: "000000" }, headers: { origin: BASE } });
  if (r.status() !== 200) throw new Error(`sign-in as ${email} failed (${r.status()})`);
  return ctx;
}
const hydrated = (p) => p.waitForSelector("html[data-hydrated]", { state: "attached", timeout: 15000 });
const unread = async (ctx) => {
  const html = await (await ctx.request.get(`${BASE}/feed`)).text();
  const m = /Notifications, (\d+) new/.exec(html);
  return m ? Number(m[1]) : 0;
};
const toastAfter = async (p) => { for (let i = 0; i < 30; i++) { await sleep(300); const t = await p.locator("[data-sonner-toast]").allInnerTexts(); if (t.length) return t.join(" | "); } return ""; };

async function publicChecks() {
  for (const path of ["/", "/sign-in", "/places", "/privacy", "/terms", "/safety", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/sw.js"]) {
    const r = await pwRequest.newContext().then((c) => c.get(BASE + path, { maxRedirects: 0 }));
    check(r.status() === 200 || (SANDBOX && path === "/sitemap.xml" && r.status() === 404), `public page ${path} answers`, `status ${r.status()}`);
  }
  // H1: browser security headers
  const home = await (await pwRequest.newContext()).get(BASE + "/");
  const h = home.headers();
  check(h["x-content-type-options"] === "nosniff", "header: X-Content-Type-Options nosniff", h["x-content-type-options"]);
  check(/strict-origin/.test(h["referrer-policy"] ?? ""), "header: Referrer-Policy", h["referrer-policy"]);
  check(/camera=\(\)/.test(h["permissions-policy"] ?? ""), "header: Permissions-Policy", h["permissions-policy"]);
  check(/frame-ancestors 'none'/.test(h["content-security-policy"] ?? ""), "header: CSP frame-ancestors 'none'", h["content-security-policy"]);
  check(/object-src 'none'/.test(h["content-security-policy"] ?? ""), "header: CSP object-src 'none'");
  check(/script-src/.test(h["content-security-policy-report-only"] ?? h["content-security-policy"] ?? ""), "header: a script-src policy is sent (report-only or enforced)");
  check(/max-age=\d+/.test(h["strict-transport-security"] ?? ""), "header: Strict-Transport-Security", h["strict-transport-security"]);
  // access control for anonymous visitors
  const anon = await pwRequest.newContext();
  for (const path of ["/feed", "/find", "/admin", "/admin/members", "/me/style", "/settings", "/notifications", "/api/people/search?q=a", "/api/games/search?q=cat"]) {
    const r = await anon.get(BASE + path, { maxRedirects: 0 });
    check(r.status() === 302 && /\/sign-in/.test(r.headers().location ?? ""), `anonymous ${path} goes to sign-in`, `status ${r.status()}`);
  }
  const post = await anon.post(BASE + "/api/push", { data: { intent: "test" }, headers: { origin: BASE }, maxRedirects: 0 });
  check(post.status() >= 300 && post.status() < 400, "anonymous POST /api/push is redirected", `status ${post.status()}`);
  if (!SANDBOX) {
    const r = await anon.post(`${BASE}/api/auth/sign-in/email-otp`, { data: { email: "raka@sandbox.test", otp: "000000" }, headers: { origin: BASE } });
    check(r.status() === 400, "real site refuses the sandbox sign-in code", `status ${r.status()}`);
  }
}

async function sandboxChecks(browser) {
  // --- member and admin access ---
  const raka = await login(browser, "raka@sandbox.test");
  for (const path of ["/feed", "/find", "/find?mode=play", "/tables", "/p/raka", "/g/224517", "/me/style", "/settings", "/notifications"]) {
    const r = await raka.request.get(BASE + path);
    check(r.status() === 200, `member page ${path}`, `status ${r.status()}`);
  }
  check((await raka.request.get(`${BASE}/admin`)).status() === 404, "a member gets 404 on /admin");
  const admin = await login(browser, "admin@sandbox.test");
  for (const path of ["/admin", "/admin/members", "/admin/content", "/admin/site", "/admin/log"]) check((await admin.request.get(BASE + path)).status() === 200, `admin page ${path}`);
  check((await admin.request.post(`${BASE}/api/push`, { data: { intent: "test" }, headers: { origin: "https://evil.example" } })).status() === 403, "push route refuses a foreign origin");

  // --- M2: picture checks ---
  const dinda = await login(browser, "dinda@sandbox.test");
  const dp = await dinda.newPage();
  const post = async (body, file) => {
    await dp.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
    await hydrated(dp);
    await dp.locator("#post-body").fill(body);
    await dp.locator("#post-image").setInputFiles(file);
    await dp.getByRole("button", { name: "Post", exact: true }).click();
    return toastAfter(dp);
  };
  const fake = await post("e2e fake picture", { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
  check(/Use a JPG, PNG or WebP/.test(fake), "an HTML file that claims to be a PNG is refused", fake);
  const ok = await post("e2e gps picture", { name: "gps.jpg", mimeType: "image/jpeg", buffer: gpsJpeg() });
  check(/Posted/.test(ok), "a JPEG with EXIF is accepted", ok);
  await dp.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
  const src = await dp.locator('img[src^="/img/posts/"]').first().getAttribute("src").catch(() => null);
  if (src) {
    const res = await dinda.request.get(BASE + src);
    const bytes = await res.body();
    check(res.headers()["content-type"] === "image/jpeg", "the stored picture has the real content type", res.headers()["content-type"]);
    check(!has(bytes, [0x88, 0x25]), "the stored picture has no GPS pointer");
    check(has(bytes, [0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, 0, 6]), "the stored picture keeps its orientation (6)");
  } else check(false, "the feed shows the new picture", "no picture found");

  // --- M5 and L6: notifications ---
  // The host of demo-table-1 is raka. bayu joins and leaves it three times.
  const bayu = await login(browser, "bayu@sandbox.test");
  const bp = await bayu.newPage();
  await bp.goto(`${BASE}/tables/demo-table-1`, { waitUntil: "networkidle" });
  await hydrated(bp);
  if (await bp.getByRole("button", { name: "Leave table" }).isVisible()) { await bp.getByRole("button", { name: "Leave table" }).click(); await bp.getByRole("button", { name: "Join table" }).waitFor(); }
  const before = await unread(raka);
  for (let i = 0; i < 3; i++) {
    await bp.getByRole("button", { name: "Join table" }).click();
    await bp.getByRole("button", { name: "Leave table" }).waitFor();
    await bp.getByRole("button", { name: "Leave table" }).click();
    await bp.getByRole("button", { name: "Join table" }).waitFor();
  }
  const after = await unread(raka);
  check(after - before <= 2, "joining and leaving a table three times sends the host at most 2 notices", `unread went from ${before} to ${after}`);
  // L6: loading the page with a plain GET must not mark anything read
  const beforeGet = await unread(raka);
  await raka.request.get(`${BASE}/notifications`);
  const afterGet = await unread(raka);
  check(beforeGet > 0 && afterGet === beforeGet, "a plain GET of /notifications does not mark messages as read", `unread ${beforeGet} -> ${afterGet}`);
  const np = await raka.newPage();
  await np.goto(`${BASE}/notifications`, { waitUntil: "networkidle" });
  await hydrated(np);
  await sleep(2500);
  check((await unread(raka)) === 0, "opening /notifications in the browser marks them as read");

  // --- L8: accessibility (axe) on a member page, phone width ---
  const ap = await raka.newPage();
  await ap.setViewportSize({ width: 390, height: 844 });
  await ap.goto(`${BASE}/feed`, { waitUntil: "networkidle" });
  await hydrated(ap);
  await ap.addScriptTag({ url: AXE });
  const violations = await ap.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } })).violations.map((v) => `${v.id}(${v.nodes.length})`));
  check(violations.length === 0, "axe finds no violation on /feed at phone width", violations.join(", "));

  await Promise.all([raka.close(), admin.close(), dinda.close(), bayu.close()]);
}

function cleanup() {
  if (!SANDBOX || process.env.E2E_CLEANUP === "0") return;
  const sql = "delete from post where body like 'e2e %'; delete from notification where text like 'Bayu joined your%' or text like 'Bayu left your%'; delete from table_player where table_id='demo-table-1' and user_id='demo-bayu'; delete from setting where key like 'up.%'";
  try {
    execSync(`npx wrangler d1 execute bekasi-bgh-staging --env staging --remote --command "${sql}"`, { stdio: "pipe", shell: true });
    console.log("cleaned up the test data");
  } catch (e) { console.log("cleanup failed:", String(e.message).slice(0, 120)); }
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  await publicChecks();
  if (SANDBOX) await sandboxChecks(browser);
  else console.log("(not the sandbox: member checks skipped)");
} catch (e) {
  fail++;
  console.log("FAIL the run stopped:", e.message);
} finally {
  await browser.close();
  cleanup();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
