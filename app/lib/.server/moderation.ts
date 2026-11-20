import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import type { z } from "zod";
import { place, playTable, post, postComment, profile, report } from "@/db/schema";
import type { reportSchema } from "@/lib/validate";
import { LIMIT_MSG, newId, type Result } from "./common";
import type { Db } from "./db";

export type ReportInput = z.infer<typeof reportSchema>;

export async function createReport(db: Db, reporterId: string, input: ReportInput): Promise<Result> {
  const [{ n }] = await db.select({ n: count() }).from(report).where(and(eq(report.reporterId, reporterId), gt(report.createdAt, new Date(Date.now() - 86400_000))));
  if (n >= 10) return { ok: false, message: LIMIT_MSG };
  await db.insert(report).values({ id: newId(), reporterId, targetType: input.targetType, targetId: input.targetId, reason: input.reason });
  console.warn(JSON.stringify({ event: "report", type: input.targetType, target: input.targetId })); // security event → Workers logs
  return { ok: true };
}

/** Open reports with a link to what was reported and who reported it. */
export async function openReports(db: Db) {
  const rows = await db
    .select({ id: report.id, type: report.targetType, targetId: report.targetId, reason: report.reason, createdAt: report.createdAt, reporter: profile.displayName })
    .from(report).leftJoin(profile, eq(profile.userId, report.reporterId))
    .where(eq(report.status, "open")).orderBy(desc(report.createdAt)).limit(50);
  const commentIds = rows.filter((r) => r.type === "comment").map((r) => r.targetId);
  const comments = commentIds.length ? await db.select({ id: postComment.id, postId: postComment.postId }).from(postComment).where(inArray(postComment.id, commentIds)) : [];
  return rows.map((r) => {
    const href =
      r.type === "member" ? `/p/${r.targetId}` : r.type === "post" ? `/posts/${r.targetId}` : r.type === "table" ? `/tables/${r.targetId}`
      : r.type === "place" ? `/places/${r.targetId}` : r.type === "play" ? `/plays/${r.targetId}`
      : comments.find((c) => c.id === r.targetId) ? `/posts/${comments.find((c) => c.id === r.targetId)!.postId}` : null;
    return { ...r, createdAt: r.createdAt.getTime(), href };
  });
}

export async function resolveReport(db: Db, reportId: string) {
  await db.update(report).set({ status: "handled" }).where(eq(report.id, reportId));
}

/** Admin: delete what was reported where that makes sense (posts, comments, tables). Members and places are handled by hand. */
export async function removeReported(db: Db, type: string, targetId: string) {
  if (type === "post") await db.delete(post).where(eq(post.id, targetId));
  else if (type === "comment") await db.delete(postComment).where(eq(postComment.id, targetId));
  else if (type === "table") await db.update(playTable).set({ status: "cancelled" }).where(eq(playTable.id, targetId));
  else if (type === "place") await db.delete(place).where(eq(place.id, targetId));
}
