// Makes new secrets for a site, saves the complete set in an ignored file, and sets them as Worker secrets (audit finding H2).
//   node scripts/rotate-secrets.mjs --env staging        -> the sandbox, saved in .dev.vars.staging
//   node scripts/rotate-secrets.mjs --env production     -> the real site, saved in .dev.vars.production
// New values: BETTER_AUTH_SECRET, PASSCODE_KEY, and a VAPID key pair. Existing values (BGG_TOKEN, Google, Gmail) are copied from .dev.vars.
// Effect of a rotation: everyone signs in again, the member passcode must be set again, and every phone must turn notifications on again.
// The saved file holds real secrets. Copy it to a password manager, and keep it out of git (the .dev.vars* rule does this).
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const site = arg("--env");
if (site !== "staging" && site !== "production") { console.error("usage: node scripts/rotate-secrets.mjs --env staging|production"); process.exit(2); }
const URL = site === "staging" ? "https://bekasi-board-game-hub-staging.bbgc.workers.dev" : "https://bekasi-board-game-hub.bbgc.workers.dev";
const ENV_ARGS = site === "staging" ? ["--env", "staging"] : [];

const local = Object.fromEntries(readFileSync(".dev.vars", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).trim()]));
const vapid = Object.fromEntries(execFileSync("node", ["scripts/vapid.mjs"], { encoding: "utf8" }).trim().split("\n").map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1)]));

const secrets = {
  BGG_TOKEN: local.BGG_TOKEN,
  BETTER_AUTH_URL: URL,
  BETTER_AUTH_SECRET: randomBytes(32).toString("base64url"),
  PASSCODE_KEY: randomBytes(32).toString("base64url"),
  VAPID_PUBLIC_KEY: vapid.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: vapid.VAPID_PRIVATE_KEY,
  // Google sign-in is on the real site only (the sandbox has no redirect address registered).
  ...(site === "production" && local.GOOGLE_CLIENT_ID && local.GOOGLE_CLIENT_SECRET ? { GOOGLE_CLIENT_ID: local.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: local.GOOGLE_CLIENT_SECRET } : {}),
  ...(local.GMAIL_USER && local.GMAIL_APP_PASSWORD ? { GMAIL_USER: local.GMAIL_USER, GMAIL_APP_PASSWORD: local.GMAIL_APP_PASSWORD } : {}),
};

const file = `.dev.vars.${site}`;
writeFileSync(file, `# Secrets of the ${site} site, made ${new Date().toISOString()}. Keep this file private: copy it to a password manager.\n` + Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
console.log(`saved: ${file} (${Object.keys(secrets).length} secrets)`);

for (const [name, value] of Object.entries(secrets)) {
  if (!value) { console.log(`${name}: no value, skipped`); continue; }
  execFileSync("npx", ["wrangler", "secret", "put", name, ...ENV_ARGS], { input: value, shell: true, stdio: ["pipe", "pipe", "pipe"] });
  console.log(`${name}: set`);
}
