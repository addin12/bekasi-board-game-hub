// Makes a `wrangler d1 export` file importable (audit finding M1, found in the restore drill).
// The export lists tables in alphabetical order, each followed by its rows. A child table can come before its parent,
// and SQLite then fails with "no such table". This puts the pieces in a safe order: tables (parents first), rows (parents first), then indexes.
// Plain TypeScript with no imports, so Node can also run it directly (scripts/*.mjs) and a unit test can pin it.

/** Splits SQL at semicolons that are outside quotes, so a semicolon or a line break inside a string stays inside it. The semicolons are not part of the result. */
export function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    cur += c;
    if (quote) { if (c === quote) quote = null; continue; } // a doubled quote ('') closes and opens again, which is fine
    if (c === "'" || c === '"' || c === "`") quote = c;
    else if (c === ";") { out.push(cur.slice(0, -1).trim()); cur = ""; } // the statement without its closing semicolon
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

const NAME = "[`\"\\[]?([A-Za-z0-9_]+)[`\"\\]]?";
const createTable = new RegExp(`^CREATE\\s+(?:TEMP\\s+|TEMPORARY\\s+)?TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${NAME}`, "i");
const insertInto = new RegExp(`^INSERT\\s+(?:OR\\s+\\w+\\s+)?INTO\\s+${NAME}`, "i");
const references = new RegExp(`REFERENCES\\s+${NAME}`, "gi");

/** Tables in a safe order: a table comes after the tables it points to. Other tables keep their original order. */
function tableOrder(tables: Map<string, string>): string[] {
  const names = [...tables.keys()];
  const parents = (name: string) => [...tables.get(name)!.matchAll(references)].map((m) => m[1]).filter((p) => p !== name && tables.has(p));
  const done = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];
  const visit = (name: string) => {
    if (done.has(name) || visiting.has(name)) return; // a loop between two tables keeps the original order
    visiting.add(name);
    for (const p of parents(name)) visit(p);
    visiting.delete(name);
    done.add(name);
    order.push(name);
  };
  names.forEach(visit);
  return order;
}

export function orderDump(sql: string): string {
  const pragmas: string[] = [];
  const tables = new Map<string, string>();
  const indexes: string[] = [];
  const rows = new Map<string, string[]>();
  const other: string[] = [];
  for (const s of splitStatements(sql)) {
    let m: RegExpExecArray | null;
    if (/^PRAGMA\b/i.test(s)) pragmas.push(s);
    else if ((m = createTable.exec(s))) tables.set(m[1], s);
    else if (/^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(s)) indexes.push(s);
    else if ((m = insertInto.exec(s))) (rows.get(m[1]) ?? rows.set(m[1], []).get(m[1])!).push(s);
    else other.push(s); // views, triggers, and anything else go last
  }
  const order = tableOrder(tables);
  const data = [...order, ...[...rows.keys()].filter((t) => !tables.has(t))].flatMap((t) => rows.get(t) ?? []);
  return [...pragmas, ...order.map((t) => tables.get(t)!), ...data, ...indexes, ...other].map((s) => s + ";").join("\n") + "\n";
}
