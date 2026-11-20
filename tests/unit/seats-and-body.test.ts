import { createRequire } from "node:module";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { joinSeatSql } from "@/lib/join-seat";
import { readCapped } from "@/lib/read-body";

// vite strips the "node:" prefix and breaks this import, so it goes through require.
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite");

describe("joinSeatSql (the real statement, run on a real SQLite)", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE table_player (table_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY (table_id, user_id))");
  const join = (table: string, who: string, seats: number) => {
    const q = new SQLiteSyncDialect().sqlToQuery(joinSeatSql(table, who, seats));
    return Number(db.prepare(q.sql).run(...q.params).changes);
  };

  it("seats players until the table is full, then refuses", () => {
    expect([join("t1", "a", 2), join("t1", "b", 2), join("t1", "c", 2)]).toEqual([1, 1, 0]);
  });
  it("does not seat the same player twice", () => {
    expect(join("t1", "a", 5)).toBe(0);
  });
  it("counts each table on its own", () => {
    expect(join("t2", "a", 1)).toBe(1);
  });
});

describe("readCapped", () => {
  const post = (body: BodyInit) => new Request("https://x.test", { method: "POST", body, duplex: "half" } as RequestInit);

  it("returns the text when it fits", async () => {
    expect(await readCapped(post("héllo"), 100)).toBe("héllo");
  });
  it("returns null when the body is over the cap, also when it has no length header", async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(6000)); c.enqueue(new Uint8Array(6000)); c.close(); } });
    expect(await readCapped(post(stream), 8 * 1024)).toBeNull();
  });
  it("returns an empty string for no body", async () => {
    expect(await readCapped(new Request("https://x.test"), 10)).toBe("");
  });
});
