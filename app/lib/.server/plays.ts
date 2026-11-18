import { and, asc, count, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { game, place, play, playPlayer, post, profile, user } from "@/db/schema";
import { likePattern, type playSchema } from "@/lib/validate";
import { ensureGames } from "./bgg";
import { personCols, refreshHotFor, toPerson } from "./cards";
import { LIMIT_MSG, newId, notify, type Result } from "./common";
import type { Db } from "./db";

export type PlayInput = z.infer<ReturnType<typeof playSchema>>;

/** Members matching a name or username, for the "who played" picker. */
export async function searchMembers(db: Db, q: string, excludeUserId: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const pat = likePattern(term);
  const rows = await db
    .select(personCols)
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(sql`(${profile.displayName} LIKE ${pat} ESCAPE '\\' OR ${profile.handle} LIKE ${pat} ESCAPE '\\') AND ${profile.userId} != ${excludeUserId}`)
    .orderBy(asc(profile.displayName))
    .limit(8);
  return rows.map(toPerson);
}

export async function createPlay(db: Db, loggerId: string, input: PlayInput): Promise<Result<{ id: string }>> {
  const [{ n }] = await db.select({ n: count() }).from(play).where(and(eq(play.loggedBy, loggerId), gt(play.createdAt, new Date(Date.now() - 86400_000))));
  if (n >= 20) return { ok: false, message: LIMIT_MSG };

  // The logger is always a player, first, and always confirmed. Other members must confirm; guests have no account.
  const members = new Map<string, { winner: boolean; score: number | null }>();
  for (const p of input.players) if (p.userId && !members.has(p.userId)) members.set(p.userId, { winner: p.winner, score: p.score });
  if (!members.has(loggerId)) members.set(loggerId, { winner: false, score: null });
  const memberIds = [...members.keys()];
  const known = await db.select({ id: profile.userId, name: profile.displayName }).from(profile).where(inArray(profile.userId, memberIds));
  if (known.length !== memberIds.length) return { ok: false, message: "One of the players isn't a member" };
  if (input.placeId) {
    const [pl] = await db.select({ id: place.id }).from(place).where(eq(place.id, input.placeId)).limit(1);
    if (!pl) return { ok: false, message: "That place doesn't exist" };
  }
  try {
    await ensureGames(db, [input.bggId]);
  } catch {
    return { ok: false, message: "BoardGameGeek isn't answering. Try again in a minute." };
  }
  const [g] = await db.select({ name: game.name }).from(game).where(eq(game.bggId, input.bggId)).limit(1);
  if (!g) return { ok: false, message: "That game couldn't be found" };

  const id = newId();
  const ordered = [loggerId, ...memberIds.filter((m) => m !== loggerId)];
  const rows = [
    ...ordered.map((uid) => ({ id: newId(), playId: id, userId: uid, guestName: null, winner: members.get(uid)!.winner, score: members.get(uid)!.score, confirmed: uid === loggerId })),
    ...input.players.filter((p) => p.guest).map((p) => ({ id: newId(), playId: id, userId: null, guestName: p.guest!, winner: p.winner, score: p.score, confirmed: true })),
  ];
  await db.batch([
    db.insert(play).values({ id, bggId: input.bggId, playedOn: input.playedOn, placeId: input.placeId, loggedBy: loggerId, durationMin: input.durationMin }),
    db.insert(playPlayer).values(rows),
    db.insert(post).values({ id: newId(), userId: loggerId, kind: "play", refId: id }),
  ] as [any, ...any[]]);

  const loggerName = known.find((k) => k.id === loggerId)?.name ?? "A member";
  for (const uid of memberIds.filter((m) => m !== loggerId)) await notify(db, uid, `${loggerName} added you to a ${g.name} play. Confirm it or remove yourself.`, `/plays/${id}`);
  await refreshHotFor(db, loggerId);
  return { ok: true, id };
}

export async function confirmPlay(db: Db, userId: string, playId: string): Promise<Result> {
  const res = await db.update(playPlayer).set({ confirmed: true }).where(and(eq(playPlayer.playId, playId), eq(playPlayer.userId, userId)));
  if (!res.meta.changes) return { ok: false, message: "You're not on this play" };
  await refreshHotFor(db, userId);
  return { ok: true };
}

/** "That wasn't me" or "remove me": always allowed. A play nobody is left on disappears. */
export async function removeMeFromPlay(db: Db, userId: string, playId: string): Promise<Result> {
  await db.delete(playPlayer).where(and(eq(playPlayer.playId, playId), eq(playPlayer.userId, userId)));
  const [{ n }] = await db.select({ n: count() }).from(playPlayer).where(and(eq(playPlayer.playId, playId), isNotNull(playPlayer.userId)));
  if (n === 0) await dropPlay(db, playId);
  await refreshHotFor(db, userId);
  return { ok: true };
}

async function dropPlay(db: Db, playId: string) {
  await db.batch([db.delete(post).where(and(eq(post.kind, "play"), eq(post.refId, playId))), db.delete(play).where(eq(play.id, playId))] as [any, ...any[]]);
}

/** Only whoever logged it (or an admin) can delete a play for everyone. */
export async function deletePlay(db: Db, userId: string, playId: string, isAdmin: boolean): Promise<Result> {
  const [p] = await db.select({ by: play.loggedBy }).from(play).where(eq(play.id, playId)).limit(1);
  if (!p) return { ok: false, message: "That play is gone" };
  if (p.by !== userId && !isAdmin) return { ok: false, message: "Only the person who logged it can delete it" };
  const members = await db.select({ id: playPlayer.userId }).from(playPlayer).where(and(eq(playPlayer.playId, playId), isNotNull(playPlayer.userId)));
  await dropPlay(db, playId);
  for (const m of members) if (m.id) await refreshHotFor(db, m.id);
  return { ok: true };
}

export async function loadPlay(db: Db, playId: string) {
  const [p] = await db
    .select({
      id: play.id, bggId: play.bggId, gameName: game.name, thumbnail: game.thumbnail, playedOn: play.playedOn, durationMin: play.durationMin,
      placeId: play.placeId, placeName: place.name, loggedBy: play.loggedBy, tableId: play.tableId,
    })
    .from(play)
    .innerJoin(game, eq(game.bggId, play.bggId))
    .leftJoin(place, eq(place.id, play.placeId))
    .where(eq(play.id, playId))
    .limit(1);
  if (!p) return null;
  const players = await db
    .select({ rowId: playPlayer.id, userId: playPlayer.userId, guestName: playPlayer.guestName, winner: playPlayer.winner, score: playPlayer.score, confirmed: playPlayer.confirmed, handle: profile.handle, displayName: profile.displayName })
    .from(playPlayer)
    .leftJoin(profile, eq(profile.userId, playPlayer.userId))
    .where(eq(playPlayer.playId, playId))
    .orderBy(desc(playPlayer.winner), desc(playPlayer.score));
  return { ...p, players: players.map((x) => ({ ...x, name: x.displayName ?? x.guestName ?? "Guest" })) };
}
export type PlayDetail = NonNullable<Awaited<ReturnType<typeof loadPlay>>>;

/** One query pair for many plays: the feed shows up to 20 of them and D1 allows few queries per request. */
export async function playSummaries(db: Db, ids: string[]) {
  const out = new Map<string, { bggId: number; gameName: string; thumbnail: string | null; playedOn: string; placeName: string | null; logger: string | null; winners: string[]; others: string[] }>();
  if (!ids.length) return out;
  const plays = await db
    .select({ id: play.id, bggId: play.bggId, gameName: game.name, thumbnail: game.thumbnail, playedOn: play.playedOn, placeName: place.name, logger: play.loggedBy })
    .from(play).innerJoin(game, eq(game.bggId, play.bggId)).leftJoin(place, eq(place.id, play.placeId))
    .where(inArray(play.id, ids));
  const players = await db
    .select({ playId: playPlayer.playId, userId: playPlayer.userId, guest: playPlayer.guestName, winner: playPlayer.winner, confirmed: playPlayer.confirmed, name: profile.displayName })
    .from(playPlayer).leftJoin(profile, eq(profile.userId, playPlayer.userId))
    .where(inArray(playPlayer.playId, ids));
  for (const p of plays) {
    // Unconfirmed members are not named: the post must not claim they played before they say so.
    const here = players.filter((x) => x.playId === p.id && x.confirmed);
    const nameOf = (x: (typeof here)[number]) => x.name ?? x.guest ?? "Guest";
    const loggerName = here.find((x) => x.userId === p.logger);
    out.set(p.id, {
      ...p,
      logger: loggerName ? nameOf(loggerName) : null,
      winners: here.filter((x) => x.winner).map(nameOf),
      others: here.filter((x) => x.userId !== p.logger).map(nameOf),
    });
  }
  return out;
}

/** Plays waiting for this member to say "yes, I was there". */
export async function pendingPlays(db: Db, userId: string) {
  return db
    .select({ playId: play.id, gameName: game.name, playedOn: play.playedOn, logger: profile.displayName })
    .from(playPlayer)
    .innerJoin(play, eq(play.id, playPlayer.playId))
    .innerJoin(game, eq(game.bggId, play.bggId))
    .leftJoin(profile, eq(profile.userId, play.loggedBy))
    .where(and(eq(playPlayer.userId, userId), eq(playPlayer.confirmed, false)))
    .orderBy(desc(play.playedOn))
    .limit(20);
}
