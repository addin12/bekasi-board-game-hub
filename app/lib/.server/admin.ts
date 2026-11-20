import { env } from "cloudflare:workers";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { auditLog, game, place, play, playTable, post, postComment, profile, setting, user } from "@/db/schema";
import type { ContentType } from "@/lib/admin-types";
import { SITE_KEYS, mergeSiteText, siteSettingKey, type SiteText } from "@/lib/site-text";
import { likePattern, profileSchema, type placeSchema } from "@/lib/validate";
import { deleteAccount } from "./account";
import { adminEmails } from "./admin-emails";
import { newId, type Result } from "./common";
import type { Db } from "./db";
import { deleteComment, deletePost } from "./feed";
import { deletePlay } from "./plays";
import { setTableStatus } from "./tables";

export const PAGE = 25;

export async function logAdmin(db: Db, adminId: string, action: string, targetType: string, targetId: string, detail = "") {
  await db.insert(auditLog).values({ id: newId(), adminId, action, targetType, targetId, detail: detail.slice(0, 300) });
}

export async function recentLog(db: Db, limit: number) {
  const rows = await db
    .select({ id: auditLog.id, action: auditLog.action, targetType: auditLog.targetType, targetId: auditLog.targetId, detail: auditLog.detail, createdAt: auditLog.createdAt, admin: profile.displayName })
    .from(auditLog).leftJoin(profile, eq(profile.userId, auditLog.adminId))
    .orderBy(desc(auditLog.createdAt)).limit(limit);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.getTime() }));
}

export async function adminStats(db: Db) {
  const [r] = (await db.all(sql`
    SELECT
      (SELECT COUNT(*) FROM profile) AS members,
      (SELECT COUNT(*) FROM profile WHERE verified_at IS NOT NULL) AS verified,
      (SELECT COUNT(DISTINCT play_id) FROM play_player WHERE confirmed = 1) AS plays,
      (SELECT COUNT(*) FROM play_table WHERE status = 'open' AND starts_at >= ${Date.now() - 3 * 3600_000}) AS tables,
      (SELECT COUNT(*) FROM post) AS posts,
      (SELECT COUNT(*) FROM post_comment) AS comments,
      (SELECT COUNT(*) FROM place) AS places,
      (SELECT COUNT(*) FROM report WHERE status = 'open') AS reports
  `)) as Record<string, number>[];
  return r as { members: number; verified: number; plays: number; tables: number; posts: number; comments: number; places: number; reports: number };
}

export const isAdminEmail = (email: string) => adminEmails().includes(email.toLowerCase());

// ---------- Members ----------

export async function listMembers(db: Db, q: string, page: number) {
  const term = q.trim();
  const pat = likePattern(term);
  const rows = await db
    .select({ userId: profile.userId, handle: profile.handle, displayName: profile.displayName, district: profile.district, email: user.email, verifiedAt: profile.verifiedAt, createdAt: profile.createdAt })
    .from(profile).innerJoin(user, eq(user.id, profile.userId))
    .where(term ? sql`${profile.displayName} LIKE ${pat} ESCAPE '\\' OR ${profile.handle} LIKE ${pat} ESCAPE '\\' OR ${user.email} LIKE ${pat} ESCAPE '\\'` : undefined)
    .orderBy(desc(profile.createdAt)).limit(PAGE + 1).offset(page * PAGE);
  return { rows: rows.slice(0, PAGE).map((r) => ({ ...r, verified: Boolean(r.verifiedAt), createdAt: r.createdAt.getTime() })), more: rows.length > PAGE };
}

export async function loadMemberForAdmin(db: Db, handle: string) {
  const [m] = await db
    .select({ userId: profile.userId, handle: profile.handle, displayName: profile.displayName, district: profile.district, bio: profile.bio, bggUsername: profile.bggUsername, avatarKey: profile.avatarKey, verifiedAt: profile.verifiedAt, createdAt: profile.createdAt, email: user.email })
    .from(profile).innerJoin(user, eq(user.id, profile.userId)).where(eq(profile.handle, handle)).limit(1);
  if (!m) return null;
  const [c] = (await db.all(sql`
    SELECT (SELECT COUNT(*) FROM user_game WHERE user_id = ${m.userId}) AS games,
           (SELECT COUNT(*) FROM post WHERE user_id = ${m.userId}) AS posts,
           (SELECT COUNT(DISTINCT play_id) FROM play_player WHERE user_id = ${m.userId} AND confirmed = 1) AS plays
  `)) as { games: number; posts: number; plays: number }[];
  return { ...m, verified: Boolean(m.verifiedAt), createdAt: m.createdAt.getTime(), counts: c, isAdmin: isAdminEmail(m.email) };
}

const memberEdit = profileSchema.pick({ displayName: true, district: true, bggUsername: true, bio: true });

export async function updateMember(db: Db, adminId: string, userId: string, form: FormData): Promise<Result<{ message: string }> | { ok: false; message: string; errors: Record<string, string> }> {
  const parsed = memberEdit.safeParse({ displayName: form.get("displayName") ?? "", district: form.get("district") ?? "", bggUsername: form.get("bggUsername") ?? "", bio: form.get("bio") ?? "" });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Check the fields marked below", errors };
  }
  await db.update(profile).set({ ...parsed.data, updatedAt: new Date() }).where(eq(profile.userId, userId));
  await logAdmin(db, adminId, "member.edit", "member", userId, "name, district, bio or BGG username changed");
  return { ok: true, message: "Saved" };
}

export async function setVerified(db: Db, adminId: string, userId: string, verified: boolean) {
  await db.update(profile).set({ verifiedAt: verified ? new Date() : null }).where(eq(profile.userId, userId));
  await logAdmin(db, adminId, verified ? "member.verify" : "member.unverify", "member", userId);
}

export async function removeMemberPhoto(db: Db, adminId: string, userId: string) {
  const [p] = await db.select({ key: profile.avatarKey }).from(profile).where(eq(profile.userId, userId)).limit(1);
  if (p?.key) await env.UPLOADS.delete(p.key);
  await db.update(profile).set({ avatarKey: null }).where(eq(profile.userId, userId));
  await logAdmin(db, adminId, "member.remove_photo", "member", userId);
}

/** Admin accounts can't be deleted here: removing an admin means changing ADMIN_EMAILS first. */
export async function deleteMemberAccount(db: Db, adminId: string, userId: string, handle: string, email: string): Promise<Result> {
  if (isAdminEmail(email)) return { ok: false, message: "This member is an admin. Remove them from ADMIN_EMAILS first" };
  await logAdmin(db, adminId, "member.delete", "member", userId, `username ${handle}`);
  await deleteAccount(db, userId);
  return { ok: true };
}

// ---------- Content ----------


export async function listContent(db: Db, type: ContentType, page: number) {
  const off = page * PAGE;
  const take = PAGE + 1;
  let rows: { id: string; title: string; meta: string; at: number }[] = [];
  if (type === "posts") {
    const r = await db.select({ id: post.id, kind: post.kind, body: post.body, at: post.createdAt, who: profile.displayName }).from(post).innerJoin(profile, eq(profile.userId, post.userId)).orderBy(desc(post.createdAt)).limit(take).offset(off);
    rows = r.map((x) => ({ id: x.id, title: x.body ? x.body.slice(0, 120) : `(${x.kind} post)`, meta: `${x.who} · ${x.kind}`, at: x.at.getTime() }));
  } else if (type === "comments") {
    const r = await db.select({ id: postComment.id, body: postComment.body, at: postComment.createdAt, who: profile.displayName }).from(postComment).innerJoin(profile, eq(profile.userId, postComment.userId)).orderBy(desc(postComment.createdAt)).limit(take).offset(off);
    rows = r.map((x) => ({ id: x.id, title: x.body.slice(0, 120), meta: x.who, at: x.at.getTime() }));
  } else if (type === "places") {
    const r = await db.select({ id: place.id, name: place.name, district: place.district, at: place.createdAt }).from(place).orderBy(asc(place.name)).limit(take).offset(off);
    rows = r.map((x) => ({ id: x.id, title: x.name, meta: x.district, at: x.at.getTime() }));
  } else if (type === "tables") {
    const r = await db.select({ id: playTable.id, game: game.name, status: playTable.status, at: playTable.startsAt, who: profile.displayName }).from(playTable).innerJoin(game, eq(game.bggId, playTable.bggId)).innerJoin(profile, eq(profile.userId, playTable.hostId)).orderBy(desc(playTable.startsAt)).limit(take).offset(off);
    rows = r.map((x) => ({ id: x.id, title: x.game, meta: `${x.who} · ${x.status}`, at: x.at.getTime() }));
  } else {
    const r = await db.select({ id: play.id, game: game.name, day: play.playedOn, at: play.createdAt, who: profile.displayName }).from(play).innerJoin(game, eq(game.bggId, play.bggId)).leftJoin(profile, eq(profile.userId, play.loggedBy)).orderBy(desc(play.createdAt)).limit(take).offset(off);
    rows = r.map((x) => ({ id: x.id, title: x.game, meta: `${x.day} · logged by ${x.who ?? "a deleted member"}`, at: x.at.getTime() }));
  }
  return { rows: rows.slice(0, PAGE), more: rows.length > PAGE };
}

/** Deletes one piece of content and logs it. Tables are cancelled (so joiners are told), not erased. */
export async function removeContent(db: Db, adminId: string, type: ContentType, id: string): Promise<Result> {
  let res: Result = { ok: true };
  if (type === "posts") res = await deletePost(db, adminId, id, true);
  else if (type === "comments") res = await deleteComment(db, adminId, id, true);
  else if (type === "places") await db.delete(place).where(eq(place.id, id));
  else if (type === "tables") {
    const [t] = await db.select({ host: playTable.hostId, status: playTable.status }).from(playTable).where(eq(playTable.id, id)).limit(1);
    if (t && t.status === "open") res = await setTableStatus(db, t.host, id, "cancelled"); // as the host, so the same notices go out
  } else res = await deletePlay(db, adminId, id, true);
  if (res.ok) await logAdmin(db, adminId, `${type}.remove`, type, id);
  return res;
}

export async function loadPlaceForAdmin(db: Db, id: string) {
  const [p] = await db.select().from(place).where(eq(place.id, id)).limit(1);
  return p ?? null;
}

export async function updatePlaceAsAdmin(db: Db, adminId: string, id: string, input: z.infer<typeof placeSchema>) {
  await db.update(place).set({ name: input.name, district: input.district, address: input.address, mapUrl: input.mapUrl, note: input.note }).where(eq(place.id, id));
  await logAdmin(db, adminId, "places.edit", "places", id, input.name);
}

// ---------- Site text ----------

export async function loadSiteText(db: Db): Promise<SiteText> {
  const rows = await db.select({ key: setting.key, value: setting.value }).from(setting).where(sql`${setting.key} LIKE 'site.%'`);
  return mergeSiteText(rows);
}

export async function saveSiteText(db: Db, adminId: string, data: SiteText) {
  for (const k of SITE_KEYS) {
    await db.insert(setting).values({ key: siteSettingKey(k), value: data[k] }).onConflictDoUpdate({ target: setting.key, set: { value: data[k], updatedAt: new Date() } });
  }
  await logAdmin(db, adminId, "site.edit", "site", "text", "home text, banner, contact or footer changed");
}
