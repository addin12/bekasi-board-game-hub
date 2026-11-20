import { and, asc, count, eq, gt, gte, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { game, place, playTable, post, profile, tablePlayer, user } from "@/db/schema";
import { formatWhen } from "@/lib/dates";
import type { tableSchema } from "@/lib/validate";
import { ensureGames } from "./bgg";
import { personCols, toPerson } from "./cards";
import { LIMIT_MSG, newId, notify, type Result } from "./common";
import { runBatch, type Db } from "./db";

export type TableInput = z.infer<ReturnType<typeof tableSchema>>;

const STILL_ON_MS = 3 * 3600_000; // a table stays joinable for 3 hours after it starts

export async function createTable(db: Db, hostId: string, input: TableInput): Promise<Result<{ id: string }>> {
  const [{ day }] = await db.select({ day: count() }).from(playTable).where(and(eq(playTable.hostId, hostId), gt(playTable.createdAt, new Date(Date.now() - 86400_000))));
  if (day >= 10) return { ok: false, message: LIMIT_MSG };
  const [{ open }] = await db.select({ open: count() }).from(playTable).where(and(eq(playTable.hostId, hostId), eq(playTable.status, "open"), gte(playTable.startsAt, new Date())));
  if (open >= 5) return { ok: false, message: "You already have 5 open tables. Finish or cancel one first." };
  if (input.placeId) {
    const [pl] = await db.select({ id: place.id }).from(place).where(eq(place.id, input.placeId)).limit(1);
    if (!pl) return { ok: false, message: "That place doesn't exist" };
  }
  try {
    await ensureGames(db, [input.bggId]);
  } catch {
    return { ok: false, message: "BoardGameGeek isn't answering. Try again in a minute." };
  }
  const id = newId();
  await runBatch(db, [
    db.insert(playTable).values({ id, hostId, bggId: input.bggId, placeId: input.placeId, startsAt: new Date(input.startsAt), seats: input.seats, note: input.note }),
    db.insert(tablePlayer).values({ tableId: id, userId: hostId }),
    db.insert(post).values({ id: newId(), userId: hostId, kind: "table", refId: id }),
  ]);
  return { ok: true, id };
}

/** Joining is one statement that only inserts while seats remain, so two people can't take the last seat. */
export async function joinTable(db: Db, userId: string, tableId: string): Promise<Result> {
  const [t] = await db.select({ host: playTable.hostId, seats: playTable.seats, status: playTable.status, startsAt: playTable.startsAt, game: game.name })
    .from(playTable).innerJoin(game, eq(game.bggId, playTable.bggId)).where(eq(playTable.id, tableId)).limit(1);
  if (!t) return { ok: false, message: "That table doesn't exist" };
  if (t.status !== "open" || t.startsAt.getTime() < Date.now() - STILL_ON_MS) return { ok: false, message: "This table is closed" };
  const [mine] = await db.select({ u: tablePlayer.userId }).from(tablePlayer).where(and(eq(tablePlayer.tableId, tableId), eq(tablePlayer.userId, userId))).limit(1);
  if (mine) return { ok: true };
  const res = await db.run(sql`INSERT OR IGNORE INTO table_player (table_id, user_id)
    SELECT ${tableId}, ${userId} WHERE (SELECT COUNT(*) FROM table_player WHERE table_id = ${tableId}) < ${t.seats}`);
  if (!res.meta.changes) return { ok: false, message: "This table is full" };
  const [who] = await db.select({ name: profile.displayName }).from(profile).where(eq(profile.userId, userId)).limit(1);
  await notify(db, t.host, `${who?.name ?? "Someone"} joined your ${t.game} table.`, `/tables/${tableId}`);
  return { ok: true };
}

export async function leaveTable(db: Db, userId: string, tableId: string): Promise<Result> {
  const [t] = await db.select({ host: playTable.hostId, game: game.name }).from(playTable).innerJoin(game, eq(game.bggId, playTable.bggId)).where(eq(playTable.id, tableId)).limit(1);
  if (!t) return { ok: false, message: "That table doesn't exist" };
  if (t.host === userId) return { ok: false, message: "You're the host. Cancel the table instead." };
  const res = await db.delete(tablePlayer).where(and(eq(tablePlayer.tableId, tableId), eq(tablePlayer.userId, userId)));
  if (res.meta.changes) {
    const [who] = await db.select({ name: profile.displayName }).from(profile).where(eq(profile.userId, userId)).limit(1);
    await notify(db, t.host, `${who?.name ?? "Someone"} left your ${t.game} table.`, `/tables/${tableId}`);
  }
  return { ok: true };
}

/** Host only. "done" is allowed once the start time has passed; "cancelled" tells everyone who joined. */
export async function setTableStatus(db: Db, userId: string, tableId: string, status: "done" | "cancelled"): Promise<Result> {
  const [t] = await db.select({ host: playTable.hostId, startsAt: playTable.startsAt, status: playTable.status, game: game.name })
    .from(playTable).innerJoin(game, eq(game.bggId, playTable.bggId)).where(eq(playTable.id, tableId)).limit(1);
  if (!t) return { ok: false, message: "That table doesn't exist" };
  if (t.host !== userId) return { ok: false, message: "Only the host can do that" };
  if (t.status !== "open") return { ok: false, message: "This table is already closed" };
  if (status === "done" && t.startsAt.getTime() > Date.now()) return { ok: false, message: "You can mark it as played once it has started" };
  await db.update(playTable).set({ status }).where(eq(playTable.id, tableId));
  if (status === "cancelled") {
    const joined = await db.select({ id: tablePlayer.userId }).from(tablePlayer).where(eq(tablePlayer.tableId, tableId));
    for (const j of joined) if (j.id !== userId) await notify(db, j.id, `The ${t.game} table on ${formatWhen(t.startsAt.getTime())} was cancelled.`, `/tables/${tableId}`);
  }
  return { ok: true };
}

export async function loadTable(db: Db, tableId: string) {
  const [t] = await db
    .select({
      id: playTable.id, hostId: playTable.hostId, bggId: playTable.bggId, gameName: game.name, thumbnail: game.thumbnail, minPlayers: game.minPlayers, maxPlayers: game.maxPlayers, playingTime: game.playingTime,
      startsAt: playTable.startsAt, seats: playTable.seats, note: playTable.note, status: playTable.status,
      placeId: playTable.placeId, placeName: place.name, placeDistrict: place.district, placeMap: place.mapUrl,
    })
    .from(playTable).innerJoin(game, eq(game.bggId, playTable.bggId)).leftJoin(place, eq(place.id, playTable.placeId))
    .where(eq(playTable.id, tableId)).limit(1);
  if (!t) return null;
  const players = await db.select(personCols).from(tablePlayer)
    .innerJoin(profile, eq(profile.userId, tablePlayer.userId)).innerJoin(user, eq(user.id, tablePlayer.userId))
    .where(eq(tablePlayer.tableId, tableId)).orderBy(asc(tablePlayer.createdAt));
  const people = players.map(toPerson);
  return { ...t, startsAt: t.startsAt.getTime(), players: people, host: people.find((p) => p.userId === t.hostId) ?? null };
}
export type TableDetail = NonNullable<Awaited<ReturnType<typeof loadTable>>>;

/** Open tables that haven't finished yet, soonest first. */
export async function listTables(db: Db, opts: { placeId?: string; limit?: number } = {}) {
  const rows = await db
    .select({
      id: playTable.id, bggId: playTable.bggId, gameName: game.name, thumbnail: game.thumbnail, startsAt: playTable.startsAt, seats: playTable.seats,
      placeId: playTable.placeId, placeName: place.name, hostName: profile.displayName,
      joined: sql<number>`(SELECT COUNT(*) FROM table_player tp WHERE tp.table_id = ${playTable.id})`,
    })
    .from(playTable).innerJoin(game, eq(game.bggId, playTable.bggId)).innerJoin(profile, eq(profile.userId, playTable.hostId)).leftJoin(place, eq(place.id, playTable.placeId))
    .where(and(eq(playTable.status, "open"), gte(playTable.startsAt, new Date(Date.now() - STILL_ON_MS)), opts.placeId ? eq(playTable.placeId, opts.placeId) : undefined))
    .orderBy(asc(playTable.startsAt)).limit(opts.limit ?? 50);
  return rows.map((r) => ({ ...r, startsAt: r.startsAt.getTime() }));
}

export async function tableSummaries(db: Db, ids: string[]) {
  const out = new Map<string, { bggId: number; gameName: string; thumbnail: string | null; startsAt: number; seats: number; joined: number; status: string; placeName: string | null }>();
  if (!ids.length) return out;
  const rows = await db
    .select({
      id: playTable.id, bggId: playTable.bggId, gameName: game.name, thumbnail: game.thumbnail, startsAt: playTable.startsAt, seats: playTable.seats, status: playTable.status, placeName: place.name,
      joined: sql<number>`(SELECT COUNT(*) FROM table_player tp WHERE tp.table_id = ${playTable.id})`,
    })
    .from(playTable).innerJoin(game, eq(game.bggId, playTable.bggId)).leftJoin(place, eq(place.id, playTable.placeId))
    .where(inArray(playTable.id, ids));
  for (const r of rows) out.set(r.id, { ...r, startsAt: r.startsAt.getTime() });
  return out;
}
