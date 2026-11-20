import { createRequire } from "node:module";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { dayKey } from "@/lib/free-tier";
import { recordMailFailure, uploadAllowed } from "@/lib/.server/limits";
import type { Db } from "@/lib/.server/db";

// vite strips the "node:" prefix and breaks this import, so it goes through require.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");

// A real Drizzle database on an in-memory SQLite. uploadAllowed and recordMailFailure only use the `setting` table.
let sqlite: InstanceType<typeof DatabaseSync>;
let db: Db;
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL DEFAULT 0)");
  db = drizzle(async (q, params, method) => {
    const st = sqlite.prepare(q);
    if (method === "run") { st.run(...params); return { rows: [] }; }
    const rows = st.all(...params).map((r: Record<string, unknown>) => Object.values(r));
    return { rows: method === "get" ? (rows[0] ?? []) : rows };
  }, { schema }) as unknown as Db;
  env.R2_FREE_BYTES = "1000"; // ceiling = 95% = 950 bytes
  (env as unknown as Record<string, unknown>).UPLOADS = { list: async () => ({ objects: [], truncated: false }) };
});

const seed = (key: string, value: unknown) =>
  sqlite.prepare("INSERT INTO setting (key, value, updated_at) VALUES (?, ?, 0)").run(key, typeof value === "string" ? value : JSON.stringify(value));
const usage = (bytes: number) => seed("usage.r2", { bytes, objects: 1, at: Date.now(), truncated: false });

describe("uploadAllowed", () => {
  it("allows a picture when storage and the daily counters are low", async () => {
    usage(100);
    expect(await uploadAllowed(db, "u1", 100)).toEqual({ ok: true });
  });
  it("refuses when the picture would pass the 95% storage ceiling", async () => {
    usage(900);
    expect(await uploadAllowed(db, "u1", 100)).toMatchObject({ ok: false, reason: "storage" });
  });
  it("refuses a member who added 10 pictures today, but not another member", async () => {
    usage(0);
    seed(`up.${dayKey()}.u1`, "10");
    expect(await uploadAllowed(db, "u1", 1)).toMatchObject({ ok: false, reason: "member" });
    expect(await uploadAllowed(db, "u2", 1)).toEqual({ ok: true });
  });
  it("refuses everybody when the site reached 300 pictures today", async () => {
    usage(0);
    seed(`up.${dayKey()}`, "300");
    expect(await uploadAllowed(db, "u3", 1)).toMatchObject({ ok: false, reason: "site" });
  });
});

describe("recordMailFailure", () => {
  it("keeps the time and a short error for the admin overview", async () => {
    await recordMailFailure(db, new Error("535 bad app password ".repeat(20)));
    const row = sqlite.prepare("SELECT value FROM setting WHERE key = 'mail.failure'").get() as { value: string };
    const saved = JSON.parse(row.value);
    expect(saved.error.length).toBeLessThanOrEqual(120);
    expect(saved.error).toContain("535");
    expect(Date.now() - saved.at).toBeLessThan(5000);
  });
});
