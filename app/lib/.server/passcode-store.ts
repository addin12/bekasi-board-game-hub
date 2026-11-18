import { env } from "cloudflare:workers";
import { and, count, eq, gt } from "drizzle-orm";
import { passcodeAttempt, profile, setting } from "@/db/schema";
import { constantTimeEqual, hashPasscode, MAX_TRIES_PER_HOUR } from "@/lib/passcode";
import type { Db } from "./db";

const KEY = "member_passcode_hash";

export async function setPasscode(db: Db, code: string) {
  const value = await hashPasscode(env.BETTER_AUTH_SECRET, code);
  await db.insert(setting).values({ key: KEY, value }).onConflictDoUpdate({ target: setting.key, set: { value, updatedAt: new Date() } });
}

export async function passcodeIsSet(db: Db) {
  const [row] = await db.select({ v: setting.value }).from(setting).where(eq(setting.key, KEY)).limit(1);
  return Boolean(row);
}

export type VerifyResult = "verified" | "wrong" | "too_many" | "not_set";

export async function verifyMember(db: Db, userId: string, code: string): Promise<VerifyResult> {
  const [row] = await db.select({ v: setting.value }).from(setting).where(eq(setting.key, KEY)).limit(1);
  if (!row) return "not_set";
  const hourAgo = new Date(Date.now() - 3600_000);
  const [{ n }] = await db.select({ n: count() }).from(passcodeAttempt).where(and(eq(passcodeAttempt.userId, userId), gt(passcodeAttempt.at, hourAgo)));
  if (n >= MAX_TRIES_PER_HOUR) return "too_many";
  if (!constantTimeEqual(await hashPasscode(env.BETTER_AUTH_SECRET, code), row.v)) {
    await db.insert(passcodeAttempt).values({ userId });
    console.warn(JSON.stringify({ event: "passcode_wrong", userId })); // security event → Workers logs
    return "wrong";
  }
  await db.update(profile).set({ verifiedAt: new Date() }).where(eq(profile.userId, userId));
  return "verified";
}
