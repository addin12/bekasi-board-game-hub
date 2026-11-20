// Backup of the database and the pictures to this PC (audit finding M1).
//   npm run backup                      -> the real site
//   npm run backup -- --env staging     -> the sandbox
// Output: backups/<site>/<date>/db.sql, backups/<site>/pictures/<key>, backups/<site>/<date>/manifest.json
// Keep the newest 8 database dumps. The `backups/` folder is ignored by git. Copy it to a drive or cloud folder you control.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const staging = process.argv.includes("--env") && process.argv[process.argv.indexOf("--env") + 1] === "staging";
const SITE = staging ? "staging" : "production";
const DB = staging ? "bekasi-bgh-staging" : "bekasi-bgh";
const BUCKET = staging ? "bekasi-bgh-staging-uploads" : "bekasi-bgh-uploads";
const ENV_ARGS = staging ? ["--env", "staging"] : [];
const KEEP = 8;

// shell:true joins the arguments into one string, so an argument with spaces (the SQL) must carry its own quotes.
const q = (s) => '"' + s + '"';
const wrangler = (args, opts = {}) => execFileSync("npx", ["wrangler", ...args], { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"], ...opts });
const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
const dir = `backups/${SITE}/${stamp}`;
mkdirSync(dir, { recursive: true });

// 1. database
wrangler(["d1", "export", DB, "--remote", ...ENV_ARGS, "--output", `${dir}/db.sql`]);
const dbBytes = statSync(`${dir}/db.sql`).size;
console.log(`database: ${dir}/db.sql (${(dbBytes / 1024).toFixed(1)} KB)`);

// 2. pictures: the keys are in the database, so no bucket listing (and no extra R2 list operations) is needed
const keysJson = wrangler(["d1", "execute", DB, "--remote", ...ENV_ARGS, "--json", "--command", q("select avatar_key as k from profile where avatar_key is not null union select image_key from post where image_key is not null")]);
const keys = JSON.parse(keysJson)[0].results.map((r) => r.k).filter((k) => /^(avatars|posts)\/[a-z0-9-]+\.(webp|jpg|png)$/.test(k));
let fetched = 0, kept = 0, failed = 0;
for (const key of keys) {
  const target = `backups/${SITE}/pictures/${key}`;
  if (existsSync(target)) { kept++; continue; }
  mkdirSync(dirname(target), { recursive: true });
  try { wrangler(["r2", "object", "get", `${BUCKET}/${key}`, "--remote", "--file", target]); fetched++; }
  catch (e) { failed++; console.warn(`picture ${key}: ${String(e.stderr ?? e.message).split("\n")[0].slice(0, 100)}`); }
}
console.log(`pictures: ${keys.length} in the database, ${fetched} downloaded, ${kept} already saved, ${failed} failed`);

writeFileSync(`${dir}/manifest.json`, JSON.stringify({ site: SITE, database: DB, bucket: BUCKET, at: new Date().toISOString(), dbBytes, pictures: { inDatabase: keys.length, downloaded: fetched, alreadySaved: kept, failed } }, null, 2));

// 3. keep the newest KEEP dumps
const dumps = readdirSync(`backups/${SITE}`).filter((d) => /^\d{4}-\d{2}-\d{2}-\d{4}$/.test(d)).sort();
for (const old of dumps.slice(0, Math.max(0, dumps.length - KEEP))) { rmSync(`backups/${SITE}/${old}`, { recursive: true, force: true }); console.log(`removed old dump ${old}`); }
if (failed) process.exit(1);
