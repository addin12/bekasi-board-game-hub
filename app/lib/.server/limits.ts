import { env, waitUntil } from "cloudflare:workers";
import { and, eq, inArray, like, lt, sql } from "drizzle-orm";
import { notification, setting, user } from "@/db/schema";
import { CEILING, FREE_TIER, alertDue, dayKey, decideUpload, levelFor, type Level, type UploadDecision } from "@/lib/free-tier";
import { d1Alert, r2Alert, type Alert } from "@/lib/limit-messages";
import { isSandboxEmail, isSandboxOn } from "@/lib/sandbox";
import { adminEmails } from "./admin-emails";
import type { Db } from "./db";
import { logFailure } from "./log";
import { mailConfigured, sendMail } from "./mail";
import { pushInBackground } from "./push";

// Free-tier guard. R2 is the one service that bills past its free amount, so new pictures stop at 95% of its free storage,
// and the admins get an email at 80%. Workers Free and D1 Free stop at their limit and never bill, so they only get the 80% email.
// Numbers and reasons: app/lib/free-tier.ts and docs/free-tier.md.

const USAGE_KEY = "usage.r2";
const STATE_KEY = "limits.state";
// Listing the bucket costs R2 operations and CPU time, so the full list runs once a day. Between lists, recordUpload adds each new
// picture to the stored total. Deleted pictures are not subtracted until the next list, so the total errs on the safe (high) side.
const FRESH_MS = 24 * 3600_000;
const MAX_LIST_PAGES = 20; // 1,000 objects per page

export type R2Usage = { bytes: number; objects: number; at: number; truncated: boolean };
type State = { r2: { warn?: number; stop?: number }; d1: { warn?: number }; checkedAt: number; mail: string };

/** The free R2 storage the percentages apply to. The optional setting R2_FREE_BYTES replaces the default of 10 GB. */
export const freeBytes = (): number => Number(env.R2_FREE_BYTES) || FREE_TIER.r2Bytes;
/** From this many bytes on, new pictures are refused. */
export const stopBytes = (): number => freeBytes() * CEILING.stopAt;

async function listBucket(): Promise<R2Usage> {
  let bytes = 0, objects = 0, cursor: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const res = await env.UPLOADS.list({ cursor, limit: 1000 });
    for (const o of res.objects) { bytes += o.size; objects++; }
    if (!res.truncated) return { bytes, objects, at: Date.now(), truncated: false };
    cursor = res.cursor;
  }
  return { bytes, objects, at: Date.now(), truncated: true }; // more than 20,000 files: a lower bound, far past the ceiling anyway
}

const put = (db: Db, key: string, value: unknown) =>
  db.insert(setting).values({ key, value: JSON.stringify(value) }).onConflictDoUpdate({ target: setting.key, set: { value: JSON.stringify(value), updatedAt: new Date() } });

async function read<T>(db: Db, key: string): Promise<T | null> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, key)).limit(1);
  if (!row) return null;
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

/** How much R2 holds. Uses the stored total when it is under a day old. */
export async function r2Usage(db: Db, { force = false }: { force?: boolean } = {}): Promise<R2Usage> {
  const stored = await read<R2Usage>(db, USAGE_KEY);
  if (stored && !force && typeof stored.bytes === "number" && Date.now() - stored.at < FRESH_MS) return stored;
  const fresh = await listBucket();
  await put(db, USAGE_KEY, fresh);
  return fresh;
}

const MAIL_FAIL_KEY = "mail.failure";
export type MailFailure = { at: number; error: string };

/** Keeps the last failed sign-in email so the admin overview can show it. Never throws: the member's request must not fail a second time. */
export async function recordMailFailure(db: Db, e: unknown) {
  try {
    await put(db, MAIL_FAIL_KEY, { at: Date.now(), error: (e instanceof Error ? e.message : String(e)).slice(0, 120) } satisfies MailFailure);
  } catch (err) {
    logFailure("mail_failure_not_saved", err);
  }
}

const counterKey =(day: string, userId?: string) => (userId ? `up.${day}.${userId}` : `up.${day}`);

async function counter(db: Db, key: string): Promise<number> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, key)).limit(1);
  return row ? Number(row.value) || 0 : 0;
}

/** Ask before every picture is stored. shortcut: read-then-write, so two uploads at the same moment can both pass (off by one or two); upgrade only if abuse shows up. */
export async function uploadAllowed(db: Db, userId: string, newBytes: number): Promise<UploadDecision> {
  const day = dayKey();
  const [usage, memberToday, siteToday] = await Promise.all([r2Usage(db), counter(db, counterKey(day, userId)), counter(db, counterKey(day))]);
  return decideUpload({ usedBytes: usage.bytes, newBytes, ceilingBytes: stopBytes(), memberToday, siteToday });
}

const bump = (db: Db, key: string) =>
  db.insert(setting).values({ key, value: "1" }).onConflictDoUpdate({ target: setting.key, set: { value: sql`cast(${setting.value} as integer) + 1`, updatedAt: new Date() } });

/** Tell the guard that a picture was stored. The ceiling tightens at once, old day counters are deleted, and the alert rules run. */
export async function recordUpload(db: Db, userId: string, bytes: number) {
  const day = dayKey();
  await Promise.all([bump(db, counterKey(day, userId)), bump(db, counterKey(day))]);
  await db.delete(setting).where(and(like(setting.key, "up.%"), lt(setting.key, `up.${day}`)));
  const stored = await read<R2Usage>(db, USAGE_KEY);
  if (stored) {
    const next = { ...stored, bytes: stored.bytes + bytes, objects: stored.objects + 1 };
    await put(db, USAGE_KEY, next);
    waitUntil(checkLimits(db, { r2: next }).then(() => undefined, (e) => logFailure("limit_check_failed", e))); // the upload does not wait for the email
  }
}

/** The bell, the phone, and the email. A failed email never stops the others. Returns what happened to the email. */
async function alertAdmins(db: Db, alert: Alert): Promise<string> {
  const emails = adminEmails();
  const admins = emails.length ? await db.select({ id: user.id }).from(user).where(inArray(user.email, emails)) : [];
  for (const a of admins) {
    await db.insert(notification).values({ id: crypto.randomUUID().replace(/-/g, "").slice(0, 16), userId: a.id, text: alert.bell, href: "/admin" });
    pushInBackground(db, a.id, { title: env.APP_NAME, body: alert.bell, url: "/admin", tag: "free-plan" });
  }
  if (!mailConfigured()) return "not sent: email is not set up";
  const real = emails.filter((e) => !isSandboxEmail(e, isSandboxOn(env.SANDBOX)));
  if (!real.length) return "not sent: no real admin address";
  const results = await Promise.allSettled(real.map((to) => sendMail(to, alert.subject, alert.text)));
  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  return failed.length ? `failed: ${String(failed[0].reason?.message ?? failed[0].reason).slice(0, 120)}` : `sent to ${real.length}`;
}

export type LimitReport = { r2: R2Usage; d1Bytes: number; r2Level: Level; d1Level: Level; checkedAt: number; mail: string };


/**
 * The whole check: measure R2 and D1, send the 80% and 95% messages when they are due, and remember the time.
 * Called after an upload, when an admin opens the overview, and by the scheduled check every few hours.
 */
export async function checkLimits(db: Db, opts: { r2?: R2Usage } = {}): Promise<LimitReport> {
  // Raw D1 calls and one batch keep the CPU time of the scheduled run well under the 10 ms of the free plan.
  // One read gives both stored values and, in its metadata, the size of the database.
  const rows = await env.DB.prepare("select key, value from setting where key in (?1, ?2)").bind(USAGE_KEY, STATE_KEY).all<{ key: string; value: string }>();
  const byKey = new Map(rows.results.map((r) => [r.key, r.value]));
  const parse = <T,>(k: string): T | null => { try { const v = byKey.get(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };
  const d1Bytes = Number(rows.meta.size_after) || 0;
  const upsert = (key: string, value: unknown) =>
    env.DB.prepare("insert into setting (key, value, updated_at) values (?1, ?2, ?3) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at").bind(key, JSON.stringify(value), Date.now());
  const writes: D1PreparedStatement[] = [];

  const stored = parse<R2Usage>(USAGE_KEY);
  let r2 = opts.r2 ?? (stored && typeof stored.bytes === "number" && Date.now() - stored.at < FRESH_MS ? stored : null);
  if (!r2) { r2 = await listBucket(); writes.push(upsert(USAGE_KEY, r2)); }

  const prev = parse<State>(STATE_KEY);
  const state: State = { r2: prev?.r2 ?? {}, d1: prev?.d1 ?? {}, checkedAt: Date.now(), mail: prev?.mail ?? "none yet" };
  const now = Date.now();
  const r2Level = levelFor(r2.bytes, freeBytes());
  const d1Level = levelFor(d1Bytes, FREE_TIER.d1DatabaseBytes);
  const site = env.BETTER_AUTH_URL;

  const r2Due = alertDue(r2Level, state.r2, now);
  if (r2Due) { state.r2[r2Due] = now; state.mail = await alertAdmins(db, r2Alert(r2Due, r2.bytes, freeBytes(), site)); }
  // D1 never needs a stop: at its limit Cloudflare refuses writes and does not bill.
  const d1Due = alertDue(d1Level === "ok" ? "ok" : "warn", state.d1, now);
  if (d1Due === "warn") { state.d1.warn = now; state.mail = await alertAdmins(db, d1Alert(d1Bytes, site)); }

  writes.push(upsert(STATE_KEY, state));
  await env.DB.batch(writes);
  return { r2, d1Bytes, r2Level, d1Level, checkedAt: state.checkedAt, mail: state.mail };
}

/** What the admin page shows. */
export async function usageReport(db: Db) {
  const report = await checkLimits(db);
  return { ...report, freeBytes: freeBytes(), stopBytes: stopBytes(), uploadsToday: await counter(db, counterKey(dayKey())), mailFailure: await read<MailFailure>(db, MAIL_FAIL_KEY) };
}

/** The scheduled check (see workers/app.ts). */
export const scheduledCheck = (db: Db) => checkLimits(db);
