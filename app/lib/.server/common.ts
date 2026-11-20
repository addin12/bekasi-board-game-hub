import { env } from "cloudflare:workers";
import { and, count, eq, isNull } from "drizzle-orm";
import { notification } from "@/db/schema";
import type { Db } from "./db";
import { recordUpload, uploadAllowed } from "./limits";
import { pushInBackground } from "./push";

/** Short random id for URLs (16 hex chars). Not a secret: access is always checked separately. */
export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export const LIMIT_MSG = "Too many requests. Try again in a few minutes.";

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; message: string };

export async function notify(db: Db, userId: string, text: string, href: string) {
  await db.insert(notification).values({ id: newId(), userId, text: text.slice(0, 200), href });
  // The same notice also goes to the member's phones, if they turned push on.
  pushInBackground(db, userId, { title: env.APP_NAME, body: text, url: href, tag: href.slice(0, 40) });
}

export async function unreadCount(db: Db, userId: string): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(notification).where(and(eq(notification.userId, userId), isNull(notification.readAt)));
  return n;
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Stores an uploaded picture in R2. Returns the key, or the message to show. */
export async function saveImage(db: Db, userId: string, file: File, prefix: "posts" | "avatars", maxBytes: number): Promise<{ key: string } | { error: string }> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Use a JPG, PNG or WebP picture" };
  if (file.size > maxBytes) return { error: `Pick a picture under ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  const allowed = await uploadAllowed(db, userId, file.size); // free-tier guard: see limits.ts
  if (!allowed.ok) return { error: allowed.message };
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  await env.UPLOADS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  await recordUpload(db, userId, file.size);
  return { key };
}
