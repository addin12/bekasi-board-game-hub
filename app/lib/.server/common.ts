import { env } from "cloudflare:workers";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { notification } from "@/db/schema";
import { prepareImage } from "@/lib/image-sniff";
import type { Db } from "./db";
import { recordUpload, uploadAllowed } from "./limits";
import { pushInBackground } from "./push";

/** Short random id for URLs (16 hex chars). Not a secret: access is always checked separately. */
export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export const LIMIT_MSG = "Too many requests. Try again in a few minutes.";

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; message: string };

/** The same message to the same person inside this time is sent once. Joining and leaving a table in a loop cannot spam a phone. */
const DUPLICATE_WINDOW_MS = 10 * 60_000;

export async function notify(db: Db, userId: string, text: string, href: string) {
  const body = text.slice(0, 200);
  const [same] = await db
    .select({ id: notification.id })
    .from(notification)
    .where(and(eq(notification.userId, userId), eq(notification.text, body), eq(notification.href, href), gt(notification.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS))))
    .limit(1);
  if (same) return;
  await db.insert(notification).values({ id: newId(), userId, text: body, href });
  // The same notice also goes to the member's phones, if they turned push on.
  pushInBackground(db, userId, { title: env.APP_NAME, body: text, url: href, tag: href.slice(0, 40) });
}

export async function unreadCount(db: Db, userId: string): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(notification).where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return n;
}

/**
 * Stores an uploaded picture in R2. Returns the key, or the message to show.
 * The browser's claimed type is ignored: the real type comes from the first bytes, and the metadata (GPS, camera, comments) is cut out.
 */
export async function saveImage(db: Db, userId: string, file: File, prefix: "posts" | "avatars", maxBytes: number): Promise<{ key: string } | { error: string }> {
  if (file.size > maxBytes) return { error: `Pick a picture under ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  const img = prepareImage(new Uint8Array(await file.arrayBuffer()));
  if (!img) return { error: "Use a JPG, PNG or WebP picture" };
  const allowed = await uploadAllowed(db, userId, img.bytes.length); // free-tier guard: see limits.ts
  if (!allowed.ok) return { error: allowed.message };
  const key = `${prefix}/${crypto.randomUUID()}.${img.ext}`;
  await env.UPLOADS.put(key, img.bytes, { httpMetadata: { contentType: img.contentType } });
  await recordUpload(db, userId, img.bytes.length);
  return { key };
}
