// Restore drill (audit finding M1): a backup is not a backup until a restore works.
//   npm run restore-check -- --env staging [--file backups/staging/<date>/db.sql]
// It loads a dump into a fresh LOCAL database (never the live one) and compares the row count of every table with the live database.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { orderDump } from "../app/lib/dump-order.ts";

const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const staging = arg("--env") === "staging";
const SITE = staging ? "staging" : "production";
const DB = staging ? "bekasi-bgh-staging" : "bekasi-bgh";
const ENV_ARGS = staging ? ["--env", "staging"] : [];
const q = (s) => '"' + s + '"'; // shell:true joins the arguments, so SQL with spaces needs its own quotes
const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { encoding: "utf8", shell: true, stdio: ["ignore", "pipe", "pipe"] });
const json = (out) => JSON.parse(out)[0].results;

let file = arg("--file");
if (!file) {
  const dumps = existsSync(`backups/${SITE}`) ? readdirSync(`backups/${SITE}`).filter((d) => /^\d{4}-\d{2}-\d{2}-\d{4}$/.test(d)).sort() : [];
  if (!dumps.length) { console.error("no dump found: run npm run backup first"); process.exit(2); }
  file = `backups/${SITE}/${dumps[dumps.length - 1]}/db.sql`;
}
console.log(`dump: ${file}`);

const STATE = ".wrangler/restore-check";
rmSync(STATE, { recursive: true, force: true });
// The export is not in an order that SQLite accepts (a child table can come before its parent), so it is ordered first.
mkdirSync(".wrangler", { recursive: true });
writeFileSync(".wrangler/restore-ordered.sql", orderDump(readFileSync(file, "utf8")));
wrangler(["d1", "execute", DB, "--local", ...ENV_ARGS, "--persist-to", STATE, "--file", ".wrangler/restore-ordered.sql"]);
rmSync(".wrangler/restore-ordered.sql", { force: true });

const tables = json(wrangler(["d1", "execute", DB, "--remote", ...ENV_ARGS, "--json", "--command", q("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%' order by name")])).map((r) => r.name);
// D1 allows about five terms in one compound SELECT, so the tables are counted in groups of five.
const groups = Array.from({ length: Math.ceil(tables.length / 5) }, (_, i) => tables.slice(i * 5, i * 5 + 5).map((t) => `select '${t}' as t, count(*) as n from ${t}`).join(" union all "));
const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.t, r.n]));
const countAll = (where) => Object.assign({}, ...groups.map((g) => toMap(json(wrangler(["d1", "execute", DB, ...where, ...ENV_ARGS, "--json", "--command", q(g)])))));
const local = countAll(["--local", "--persist-to", STATE]);
const live = countAll(["--remote"]);

let bad = 0;
for (const t of tables) {
  const same = local[t] === live[t];
  if (!same) bad++;
  console.log(`${same ? "ok  " : "DIFF"} ${t.padEnd(22)} restored ${String(local[t]).padStart(6)}   live ${String(live[t]).padStart(6)}`);
}
rmSync(STATE, { recursive: true, force: true });
console.log(bad ? `\n${bad} table(s) differ. Some difference is normal if the site changed after the dump.` : `\nRESTORE OK: all ${tables.length} tables match the live database.`);
process.exit(bad ? 1 : 0);
