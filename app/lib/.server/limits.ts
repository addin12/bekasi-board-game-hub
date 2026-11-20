import { env } from "cloudflare:workers";
import { eq, like, lt, and, sql } from "drizzle-orm";
import { setting } from "@/db/schema";
import { CEILING, dayKey, decideUpload, type UploadDecision } from "@/lib/free-tier";
import type { Db } from "./db";

// Free-tier guard. R2 is the one service that bills past its free amount, so uploads stop at a ceiling below it.
// Numbers and reasons: app/lib/free-tier.ts and docs/free-tier.md.

const USAGE_KEY = "usage.r2";
const FRESH_MS = 3600_000; // listing the bucket costs R2 operations, so the total is kept for one hour
const MAX_LIST_PAGES = 20; // 1,000 objects per page

export type R2Usage = { bytes: number; objects: number; at: number; truncated: boolean };

async function listBucket(): Promise<R2Usage> {
  let bytes = 0, objects = 0, cursor: string | undefined, truncated = false;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const res = await env.UPLOADS.list({ cursor, limit: 1000 });
    for (const o of res.objects) { bytes += o.size; objects++; }
    if (!res.truncated) return { bytes, objects, at: Date.now(), truncated: false };
    cursor = res.cursor;
  }
  truncated = true; // more than 20,000 objects: the total is a lower bound, which is far past our ceiling anyway
  return { bytes, objects, at: Date.now(), truncated };
}

const save = (db: Db, u: R2Usage) =>
  db.insert(setting).values({ key: USAGE_KEY, value: JSON.stringify(u) }).onConflictDoUpdate({ target: setting.key, set: { value: JSON.stringify(u), updatedAt: new Date() } });

/** How much R2 holds. Uses the stored total when it is under an hour old. */
export async function r2Usage(db: Db, { force = false }: { force?: boolean } = {}): Promise<R2Usage> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, USAGE_KEY)).limit(1);
  if (row && !force) {
    try {
      const u = JSON.parse(row.value) as R2Usage;
      if (typeof u.bytes === "number" && Date.now() - u.at < FRESH_MS) return u;
    } catch { /* a damaged row is replaced below */ }
  }
  const fresh = await listBucket();
  await save(db, fresh);
  return fresh;
}

const counterKey = (day: string, userId?: string) => (userId ? `up.${day}.${userId}` : `up.${day}`);

async function counter(db: Db, key: string): Promise<number> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, key)).limit(1);
  return row ? Number(row.value) || 0 : 0;
}

/** The ceiling: an optional setting R2_CEILING_BYTES overrides the default. */
export const ceilingBytes = (): number => Number(env.R2_CEILING_BYTES) || CEILING.r2Bytes;

/** Ask before every picture is stored. */
export async function uploadAllowed(db: Db, userId: string, newBytes: number): Promise<UploadDecision> {
  const day = dayKey();
  const [usage, memberToday, siteToday] = await Promise.all([r2Usage(db), counter(db, counterKey(day, userId)), counter(db, counterKey(day))]);
  return decideUpload({ usedBytes: usage.bytes, newBytes, ceilingBytes: ceilingBytes(), memberToday, siteToday });
}

const bump = (db: Db, key: string) =>
  db.insert(setting).values({ key, value: "1" }).onConflictDoUpdate({ target: setting.key, set: { value: sql`cast(${setting.value} as integer) + 1`, updatedAt: new Date() } });

/** Tell the guard that a picture was stored. The ceiling tightens at once, and old day counters are deleted. */
export async function recordUpload(db: Db, userId: string, bytes: number) {
  const day = dayKey();
  await Promise.all([bump(db, counterKey(day, userId)), bump(db, counterKey(day))]);
  await db.delete(setting).where(and(like(setting.key, "up.%"), lt(setting.key, `up.${day}`)));
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, USAGE_KEY)).limit(1);
  if (row) {
    try {
      const u = JSON.parse(row.value) as R2Usage;
      await save(db, { ...u, bytes: u.bytes + bytes, objects: u.objects + 1 });
    } catch { /* the next listing repairs it */ }
  }
}

/** What the admin page shows. */
export async function usageReport(db: Db) {
  const [r2, size] = await Promise.all([r2Usage(db), env.DB.prepare("select 1").run().then((r) => Number(r.meta.size_after) || 0).catch(() => 0)]);
  const day = dayKey();
  return { r2, d1Bytes: size, ceilingBytes: ceilingBytes(), uploadsToday: await counter(db, counterKey(day)) };
}
