// Puts a `wrangler d1 export` file in an order that D1 and SQLite accept. Use it before a real restore (see docs/runbook-backup-restore.md).
//   npm run restore-prepare -- backups/production/<date>/db.sql      -> writes db.ordered.sql next to it
import { readFileSync, writeFileSync } from "node:fs";
import { orderDump } from "../app/lib/dump-order.ts";

const [input] = process.argv.slice(2);
if (!input) { console.error("usage: npm run restore-prepare -- <path to db.sql>"); process.exit(2); }
const out = input.replace(/\.sql$/, ".ordered.sql");
writeFileSync(out, orderDump(readFileSync(input, "utf8")));
console.log(`written: ${out}`);
