import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { post, profile, user } from "@/db/schema";
import type { Db } from "./db";

/**
 * Deletes a member and everything that belongs to them: card, posts, comments, likes, hosted tables, picture files.
 * Foreign keys cascade the rows. Plays that nobody is left on are removed too; plays with other members stay for them.
 */
export async function deleteAccount(db: Db, userId: string) {
  const [p] = await db.select({ avatarKey: profile.avatarKey }).from(profile).where(eq(profile.userId, userId)).limit(1);
  const images = await db.select({ key: post.imageKey }).from(post).where(eq(post.userId, userId));
  for (const k of [p?.avatarKey, ...images.map((i) => i.key)]) if (k) await env.UPLOADS.delete(k);
  await db.delete(user).where(eq(user.id, userId));
  const orphan = sql`NOT EXISTS (SELECT 1 FROM play_player pp WHERE pp.play_id = play.id AND pp.user_id IS NOT NULL)`;
  await db.run(sql`DELETE FROM post WHERE kind = 'play' AND ref_id IN (SELECT id FROM play WHERE ${orphan})`);
  await db.run(sql`DELETE FROM play WHERE ${orphan}`);
  console.warn(JSON.stringify({ event: "account_deleted" })); // no personal data in the log
}
