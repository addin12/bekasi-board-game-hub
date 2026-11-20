import { env, waitUntil } from "cloudflare:workers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { pushSubscription } from "@/db/schema";
import type { Db } from "./db";
import { logFailure } from "./log";
import { sendOne, subscriptionSchema, type Notice } from "./webpush";

/** Push works only when the site has its VAPID key pair. */
export const pushEnabled = () => Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

const MAX_DEVICES = 5;
export async function saveSubscription(db: Db, userId: string, raw: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "This browser sent a notification setup we cannot use" };
  const { endpoint, keys } = parsed.data;
  // The same device may switch accounts, so the endpoint moves to the member who is signed in now.
  await db
    .insert(pushSubscription)
    .values({ id: crypto.randomUUID().replace(/-/g, "").slice(0, 16), userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { userId, p256dh: keys.p256dh, auth: keys.auth } });
  const mine = await db.select({ id: pushSubscription.id }).from(pushSubscription).where(eq(pushSubscription.userId, userId)).orderBy(desc(pushSubscription.createdAt));
  if (mine.length > MAX_DEVICES) await db.delete(pushSubscription).where(inArray(pushSubscription.id, mine.slice(MAX_DEVICES).map((r) => r.id)));
  return { ok: true };
}

export async function removeSubscription(db: Db, userId: string, endpoint: unknown) {
  if (typeof endpoint !== "string") return;
  // Only the owner of a device can remove it.
  await db.delete(pushSubscription).where(and(eq(pushSubscription.endpoint, endpoint), eq(pushSubscription.userId, userId)));
}

/** Sends a notice to every device of one member. Devices that the push service reports as gone are deleted. Returns how many accepted it. */
export async function pushToUser(db: Db, userId: string, notice: Notice): Promise<number> {
  if (!pushEnabled()) return 0;
  const subs = await db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId));
  if (!subs.length) return 0;
  const vapid = { subject: env.BETTER_AUTH_URL, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  const statuses = await Promise.all(subs.map((s) => sendOne(s, notice, vapid)));
  const gone = subs.filter((_, i) => statuses[i] === 404 || statuses[i] === 410).map((s) => s.id);
  if (gone.length) await db.delete(pushSubscription).where(inArray(pushSubscription.id, gone));
  return statuses.filter((s) => s >= 200 && s < 300).length;
}

/** Fire and forget: the page that caused the notice does not wait for the push services. A failure never breaks that page. */
export function pushInBackground(db: Db, userId: string, notice: Notice) {
  if (!pushEnabled()) return;
  waitUntil(pushToUser(db, userId, notice).catch((e) => { logFailure("push_failed", e); return 0; }));
}
