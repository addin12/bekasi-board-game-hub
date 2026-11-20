import { describe, expect, it } from "vitest";
import { orderDump, splitStatements } from "../../app/lib/dump-order";

// The shape of a `wrangler d1 export` file: tables in alphabetical order, each followed by its rows. A child table can come before its parent.
const dump = [
  "PRAGMA defer_foreign_keys=TRUE;",
  'CREATE TABLE `account` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`userId` text NOT NULL,\n\tFOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade\n);',
  'INSERT INTO "account" ("id","userId") VALUES(\'a1\',\'u1\');',
  "CREATE INDEX `account_user` ON `account` (`userId`);",
  "CREATE TABLE `user` (\n\t`id` text PRIMARY KEY NOT NULL,\n\t`name` text\n);",
  "INSERT INTO \"user\" (\"id\",\"name\") VALUES('u1','semi;colon and ''quote''');",
  "INSERT INTO \"user\" (\"id\",\"name\") VALUES('u2','two\nlines');",
].join("\n");

describe("splitStatements", () => {
  it("splits at semicolons and keeps a semicolon inside a string", () => {
    const parts = splitStatements(dump);
    expect(parts).toHaveLength(7);
    expect(parts.some((p) => p.includes("semi;colon and ''quote''"))).toBe(true);
  });
  it("keeps a line break inside a string", () => {
    expect(splitStatements(dump).some((p) => p.includes("two\nlines"))).toBe(true);
  });
});

describe("orderDump", () => {
  const out = orderDump(dump);
  const at = (needle: string) => out.indexOf(needle);

  it("keeps every statement", () => {
    expect(splitStatements(out)).toHaveLength(7);
  });
  it("starts with the pragma", () => {
    expect(out.startsWith("PRAGMA defer_foreign_keys=TRUE;")).toBe(true);
  });
  it("creates the parent table before the child table", () => {
    expect(at("CREATE TABLE `user`")).toBeGreaterThan(-1);
    expect(at("CREATE TABLE `user`")).toBeLessThan(at("CREATE TABLE `account`"));
  });
  it("puts all rows after all tables, and the parent rows before the child rows", () => {
    expect(at('INSERT INTO "user"')).toBeGreaterThan(at("CREATE TABLE `account`"));
    expect(at('INSERT INTO "user"')).toBeLessThan(at('INSERT INTO "account"'));
  });
  it("creates indexes after the rows", () => {
    expect(at("CREATE INDEX")).toBeGreaterThan(at('INSERT INTO "account"'));
  });
  it("is stable: ordering twice gives the same text", () => {
    expect(orderDump(out)).toBe(out);
  });
  it("keeps tables that have no parent in their original order", () => {
    const plain = orderDump("CREATE TABLE b (x);\nCREATE TABLE a (x);\nINSERT INTO a (x) VALUES(1);\nINSERT INTO b (x) VALUES(2);");
    expect(plain.indexOf("CREATE TABLE b")).toBeLessThan(plain.indexOf("CREATE TABLE a"));
    expect(plain.indexOf("INSERT INTO b")).toBeLessThan(plain.indexOf("INSERT INTO a"));
  });
});
