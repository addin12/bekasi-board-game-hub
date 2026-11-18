import { env } from "cloudflare:workers";
import { and, asc, count, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { post, postComment, postLike, profile, user } from "@/db/schema";
import { personCols, toPerson, type PersonLite } from "./cards";
import { LIMIT_MSG, newId, notify, saveImage, type Result } from "./common";
import type { Db } from "./db";
import { playSummaries } from "./plays";
import { tableSummaries } from "./tables";

const PAGE = 20;

export type FeedItem = {
  id: string; kind: "status" | "play" | "table" | "trade"; body: string; imageKey: string | null; refId: string | null; createdAt: number;
  author: PersonLite; likes: number; liked: boolean; comments: number;
  play: Awaited<ReturnType<typeof playSummaries>> extends Map<string, infer V> ? V | null : never;
  table: Awaited<ReturnType<typeof tableSummaries>> extends Map<string, infer V> ? V | null : never;
};

type PostRow = { id: string; kind: FeedItem["kind"]; body: string; imageKey: string | null; refId: string | null; createdAt: Date; author: Parameters<typeof toPerson>[0] };

const postCols = { id: post.id, kind: post.kind, body: post.body, imageKey: post.imageKey, refId: post.refId, createdAt: post.createdAt };

/** Adds likes, comment counts and the live details of play/table posts to a page of posts (a fixed number of queries). */
async function hydrate(db: Db, viewerId: string, rows: PostRow[]): Promise<FeedItem[]> {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [];
  const [likeRows, mine, commentRows, plays, tables] = await Promise.all([
    db.select({ id: postLike.postId, n: count() }).from(postLike).where(inArray(postLike.postId, ids)).groupBy(postLike.postId),
    db.select({ id: postLike.postId }).from(postLike).where(and(eq(postLike.userId, viewerId), inArray(postLike.postId, ids))),
    db.select({ id: postComment.postId, n: count() }).from(postComment).where(inArray(postComment.postId, ids)).groupBy(postComment.postId),
    playSummaries(db, rows.filter((r) => r.kind === "play" && r.refId).map((r) => r.refId!)),
    tableSummaries(db, rows.filter((r) => r.kind === "table" && r.refId).map((r) => r.refId!)),
  ]);
  return rows.map((r) => ({
    id: r.id, kind: r.kind, body: r.body, imageKey: r.imageKey, refId: r.refId, createdAt: r.createdAt.getTime(),
    author: toPerson(r.author),
    likes: likeRows.find((l) => l.id === r.id)?.n ?? 0,
    liked: mine.some((m) => m.id === r.id),
    comments: commentRows.find((c) => c.id === r.id)?.n ?? 0,
    play: r.kind === "play" && r.refId ? plays.get(r.refId) ?? null : null,
    table: r.kind === "table" && r.refId ? tables.get(r.refId) ?? null : null,
  }));
}

export async function loadFeed(db: Db, viewerId: string, before?: number): Promise<{ items: FeedItem[]; next: number | null }> {
  const raw = await db
    .select({ ...postCols, author: personCols })
    .from(post).innerJoin(profile, eq(profile.userId, post.userId)).innerJoin(user, eq(user.id, post.userId))
    .where(before ? lt(post.createdAt, new Date(before)) : undefined)
    .orderBy(desc(post.createdAt)).limit(PAGE + 1);
  const page = raw.slice(0, PAGE);
  const items = await hydrate(db, viewerId, page);
  return { items, next: raw.length > PAGE ? page[page.length - 1].createdAt.getTime() : null };
}

export async function loadPost(db: Db, viewerId: string, postId: string) {
  const [row] = await db
    .select({ ...postCols, author: personCols })
    .from(post).innerJoin(profile, eq(profile.userId, post.userId)).innerJoin(user, eq(user.id, post.userId))
    .where(eq(post.id, postId)).limit(1);
  if (!row) return null;
  const [item] = await hydrate(db, viewerId, [row]);
  const comments = await db
    .select({ id: postComment.id, body: postComment.body, createdAt: postComment.createdAt, userId: postComment.userId, handle: profile.handle, name: profile.displayName })
    .from(postComment).innerJoin(profile, eq(profile.userId, postComment.userId))
    .where(eq(postComment.postId, postId)).orderBy(asc(postComment.createdAt)).limit(100);
  return { item, comments: comments.map((c) => ({ ...c, createdAt: c.createdAt.getTime() })) };
}

const IMG_MAX = 3 * 1024 * 1024;

export async function createStatusPost(db: Db, userId: string, body: string, file: File | null): Promise<Result<{ id: string }>> {
  const hasFile = file !== null && file.size > 0;
  if (!body && !hasFile) return { ok: false, message: "Write something or add a picture" };
  const [{ n }] = await db.select({ n: count() }).from(post).where(and(eq(post.userId, userId), eq(post.kind, "status"), gt(post.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= 20) return { ok: false, message: LIMIT_MSG };
  let imageKey: string | null = null;
  if (hasFile) {
    const saved = await saveImage(file, "posts", IMG_MAX);
    if ("error" in saved) return { ok: false, message: saved.error };
    imageKey = saved.key;
  }
  const id = newId();
  await db.insert(post).values({ id, userId, kind: "status", body, imageKey });
  return { ok: true, id };
}

/** "is selling Catan" / "sold Catan". The "sold " prefix is what the Trader badge counts. */
export async function tradePost(db: Db, userId: string, bggId: number, body: string) {
  await db.insert(post).values({ id: newId(), userId, kind: "trade", body, refId: String(bggId) });
}

export async function toggleLike(db: Db, userId: string, postId: string): Promise<Result<{ liked: boolean }>> {
  const [p] = await db.select({ id: post.id }).from(post).where(eq(post.id, postId)).limit(1);
  if (!p) return { ok: false, message: "That post is gone" };
  const [had] = await db.select({ id: postLike.postId }).from(postLike).where(and(eq(postLike.postId, postId), eq(postLike.userId, userId))).limit(1);
  if (had) await db.delete(postLike).where(and(eq(postLike.postId, postId), eq(postLike.userId, userId)));
  else await db.insert(postLike).values({ postId, userId }).onConflictDoNothing();
  return { ok: true, liked: !had };
}

export async function addComment(db: Db, userId: string, postId: string, body: string): Promise<Result> {
  const [{ n }] = await db.select({ n: count() }).from(postComment).where(and(eq(postComment.userId, userId), gt(postComment.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= 60) return { ok: false, message: LIMIT_MSG };
  const [p] = await db.select({ author: post.userId }).from(post).where(eq(post.id, postId)).limit(1);
  if (!p) return { ok: false, message: "That post is gone" };
  await db.insert(postComment).values({ id: newId(), postId, userId, body });
  if (p.author !== userId) {
    const [who] = await db.select({ name: profile.displayName }).from(profile).where(eq(profile.userId, userId)).limit(1);
    await notify(db, p.author, `${who?.name ?? "Someone"} commented on your post.`, `/posts/${postId}`);
  }
  return { ok: true };
}

/** The author or an admin removes a post, its picture, likes and comments. */
export async function deletePost(db: Db, userId: string, postId: string, isAdmin: boolean): Promise<Result> {
  const [p] = await db.select({ author: post.userId, imageKey: post.imageKey }).from(post).where(eq(post.id, postId)).limit(1);
  if (!p) return { ok: true };
  if (p.author !== userId && !isAdmin) return { ok: false, message: "Only the author can delete this" };
  if (p.imageKey) await env.UPLOADS.delete(p.imageKey);
  await db.delete(post).where(eq(post.id, postId));
  return { ok: true };
}

export async function deleteComment(db: Db, userId: string, commentId: string, isAdmin: boolean): Promise<Result> {
  const [c] = await db.select({ author: postComment.userId }).from(postComment).where(eq(postComment.id, commentId)).limit(1);
  if (!c) return { ok: true };
  if (c.author !== userId && !isAdmin) return { ok: false, message: "Only the author can delete this" };
  await db.delete(postComment).where(eq(postComment.id, commentId));
  return { ok: true };
}
