import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { game, play, playPlayer, profile, user, userGame, type Kind } from "@/db/schema";
import { earnedBadges, type BadgeStats } from "@/lib/badges";
import { todayWib } from "@/lib/dates";
import { chooseHot, type HotSource } from "@/lib/hotness";
import { BggBusy, ensureGames, hotList, recentPlays } from "./bgg";
import { inParts, type Db } from "./db";
import { uniqueMatches, type FindMode, type MatchReason } from "@/lib/find";
import { isStyle, type StyleCode } from "@/lib/play-style";
export type { FindMode, MatchReason };

export type GameLite = { bggId: number; name: string; year: number | null; thumbnail: string | null };
export type CardGame = GameLite & { kind: Kind; price: number | null; condition: string | null; note: string | null };
export type PersonLite = {
  userId: string; handle: string; displayName: string; district: string; avatar: string | null; verified: boolean; playStyle: StyleCode | null;
};

export const personCols = {
  userId: profile.userId, handle: profile.handle, displayName: profile.displayName, district: profile.district,
  avatarKey: profile.avatarKey, image: user.image, verifiedAt: profile.verifiedAt, playStyle: profile.playStyle,
};
export const toPerson = (r: { userId: string; handle: string; displayName: string; district: string; avatarKey: string | null; image: string | null; verifiedAt: Date | null; playStyle: string | null }): PersonLite => ({
  userId: r.userId, handle: r.handle, displayName: r.displayName, district: r.district,
  avatar: r.avatarKey ? `/img/${r.avatarKey}` : r.image, verified: Boolean(r.verifiedAt),
  playStyle: isStyle(r.playStyle) ? r.playStyle : null,
});

async function hotFallback(db: Db): Promise<GameLite[]> {
  try {
    const ids = (await hotList()).slice(0, 3);
    await ensureGames(db, ids);
    const rows = await db.select({ bggId: game.bggId, name: game.name, year: game.year, thumbnail: game.thumbnail }).from(game).where(inArray(game.bggId, ids));
    return ids.map((id) => rows.find((r) => r.bggId === id)).filter((g): g is GameLite => Boolean(g));
  } catch {
    return []; // BGG down: the card simply shows no hotness.
  }
}

export async function loadCard(db: Db, where: { handle: string } | { userId: string }) {
  const [p] = await db
    .select({ ...personCols, bio: profile.bio, bggUsername: profile.bggUsername, hotSource: profile.hotSource })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where("handle" in where ? eq(profile.handle, where.handle) : eq(profile.userId, where.userId))
    .limit(1);
  if (!p) return null;
  const games: CardGame[] = await db
    .select({
      bggId: game.bggId, name: game.name, year: game.year, thumbnail: game.thumbnail,
      kind: userGame.kind, price: userGame.price, condition: userGame.condition, note: userGame.note,
    })
    .from(userGame)
    .innerJoin(game, eq(game.bggId, userGame.bggId))
    .where(eq(userGame.userId, p.userId))
    .orderBy(asc(userGame.position), asc(game.name));
  const by = (k: Kind) => games.filter((g) => g.kind === k);
  let hotSource: HotSource | null = p.hotSource;
  let hot: GameLite[] = by("hot");
  if (!hot.length) {
    hot = await hotFallback(db);
    hotSource = hot.length ? "bgg_hot" : null;
  }
  const stats = await badgeStatsFor(db, p.userId);
  return {
    person: toPerson(p), bio: p.bio, bggUsername: p.bggUsername, hotSource,
    favorite: by("favorite"), hot, want: by("want"), own: by("own"), sell: by("sell"), buy: by("buy"),
    stats, badges: earnedBadges(stats).map(({ code, name, rule }) => ({ code, name, rule })), // plain data: it crosses to the browser
  };
}
export type Card = NonNullable<Awaited<ReturnType<typeof loadCard>>>;

/** Counts behind the badges. Only plays the member confirmed count. */
export async function badgeStatsFor(db: Db, userId: string): Promise<BadgeStats> {
  const rows = (await db.all(sql`
    SELECT
      (SELECT COUNT(DISTINCT pp.play_id) FROM play_player pp WHERE pp.user_id = ${userId} AND pp.confirmed = 1) AS plays,
      (SELECT COUNT(DISTINCT p.bgg_id) FROM play_player pp JOIN play p ON p.id = pp.play_id WHERE pp.user_id = ${userId} AND pp.confirmed = 1) AS games,
      (SELECT COUNT(DISTINCT p.place_id) FROM play_player pp JOIN play p ON p.id = pp.play_id WHERE pp.user_id = ${userId} AND pp.confirmed = 1 AND p.place_id IS NOT NULL) AS places,
      (SELECT COUNT(*) FROM play_table WHERE host_id = ${userId} AND status = 'done') AS hosted,
      (SELECT COUNT(*) FROM post WHERE user_id = ${userId} AND kind = 'trade' AND body LIKE 'sold %') AS sold
  `)) as BadgeStats[];
  return rows[0] ?? { plays: 0, games: 0, places: 0, hosted: 0, sold: 0 };
}

/** Recomputes a member's hot games. Logged plays win once there are enough, then their BGG plays; the global hot list is shown, never stored. */
export async function refreshHot(db: Db, userId: string, bggUsername: string | null) {
  let bggPlays = null;
  if (bggUsername) {
    try { bggPlays = await recentPlays(bggUsername); } catch (e) { if (!(e instanceof BggBusy)) console.warn("BGG plays", e); }
  }
  const since = todayWib(Date.now() - 90 * 86400_000);
  const logged = await db
    .select({ bggId: play.bggId, date: play.playedOn })
    .from(playPlayer)
    .innerJoin(play, eq(play.id, playPlayer.playId))
    .where(and(eq(playPlayer.userId, userId), eq(playPlayer.confirmed, true), gte(play.playedOn, since)));
  const pick = chooseHot({ sessionPlays: logged, bggPlays, bggHot: [] });
  await db.delete(userGame).where(and(eq(userGame.userId, userId), eq(userGame.kind, "hot")));
  if (pick.source !== "bgg_hot" && pick.ids.length) {
    await ensureGames(db, pick.ids);
    await db.insert(userGame).values(pick.ids.map((bggId, position) => ({ userId, bggId, kind: "hot" as const, position })));
  }
  await db.update(profile).set({ hotSource: pick.ids.length ? pick.source : null, hotUpdatedAt: new Date() }).where(eq(profile.userId, userId));
}

/** refreshHot for callers that only know the member (a play was confirmed or removed). Never throws: hotness is a bonus. */
export async function refreshHotFor(db: Db, userId: string) {
  try {
    const [p] = await db.select({ bgg: profile.bggUsername }).from(profile).where(eq(profile.userId, userId)).limit(1);
    if (p) await refreshHot(db, userId, p.bgg);
  } catch (e) {
    console.warn("refreshHotFor", e);
  }
}

/** Everyone who has this game on their card, by kind. */
export async function gamePeople(db: Db, bggId: number) {
  const rows = await db
    .select({ ...personCols, kind: userGame.kind, price: userGame.price, condition: userGame.condition })
    .from(userGame)
    .innerJoin(profile, eq(profile.userId, userGame.userId))
    .innerJoin(user, eq(user.id, userGame.userId))
    .where(eq(userGame.bggId, bggId))
    .orderBy(asc(profile.displayName));
  return rows.map((r) => ({ ...toPerson(r), kind: r.kind, price: r.price, condition: r.condition }));
}

// ---------- Find ----------

type Row = { user_id: string; bgg_id: number; reason: MatchReason; price: number | null };

function matchSql(mode: FindMode, me: string, bggId: number | null) {
  if (bggId) {
    const kinds = { like: ["favorite", "hot"], play: ["want", "own"], trade: ["sell", "buy"] }[mode];
    return sql`SELECT user_id, bgg_id, price, CASE kind WHEN 'favorite' THEN 'loves' WHEN 'hot' THEN 'loves' WHEN 'want' THEN 'wants'
      WHEN 'own' THEN 'owns' WHEN 'sell' THEN 'sells' ELSE 'buys' END AS reason
      FROM user_game WHERE bgg_id = ${bggId} AND user_id != ${me} AND kind IN ${kinds}`;
  }
  const pair = (theirs: string[], mine: string[], reason: MatchReason) => sql`
    SELECT t.user_id, t.bgg_id, t.price, ${reason} AS reason FROM user_game t
    JOIN user_game m ON m.bgg_id = t.bgg_id AND m.user_id = ${me} AND m.kind IN ${mine}
    WHERE t.user_id != ${me} AND t.kind IN ${theirs}`;
  if (mode === "like") return pair(["favorite", "hot"], ["favorite", "hot"], "shared_love");
  if (mode === "play")
    return sql`${pair(["own"], ["want"], "owns_your_want")} UNION ${pair(["want"], ["want"], "wants_too")} UNION ${pair(["want"], ["own"], "wants_your_game")}`;
  return sql`${pair(["sell"], ["buy"], "sells_your_buy")} UNION ${pair(["buy"], ["sell"], "buys_your_sell")}`;
}

/** The Find page shows the best matches first and at most this many. The page tells the member how many more there are. */
const MAX_FOUND = 60;

export async function findPeople(
  db: Db,
  input: { me: string; mode: FindMode; bggId: number | null; district: string | null; verifiedOnly: boolean },
) {
  const rows = (await db.all(matchSql(input.mode, input.me, input.bggId))) as Row[];
  if (!rows.length) return { people: [], total: 0 };
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const gameIds = [...new Set(rows.map((r) => r.bgg_id))];
  // D1 takes 100 bound values per query, so a long list goes in parts (before this, Find failed once more than 100 members matched).
  const [people, games] = await Promise.all([
    inParts(userIds, (part) => db.select(personCols).from(profile).innerJoin(user, eq(user.id, profile.userId)).where(inArray(profile.userId, part))),
    inParts(gameIds, (part) => db.select({ bggId: game.bggId, name: game.name, year: game.year, thumbnail: game.thumbnail }).from(game).where(inArray(game.bggId, part))),
  ]);
  const gameById = new Map(games.map((g) => [g.bggId, g]));
  // Same play style is a tie-breaker for people who match on games. It never adds a person who has no game in common.
  const [mine] = await db.select({ style: profile.playStyle }).from(profile).where(eq(profile.userId, input.me)).limit(1);
  const myStyle = input.mode === "trade" || !isStyle(mine?.style) ? null : mine.style;
  const found = people
    .map(toPerson)
    .filter((p) => (!input.district || p.district === input.district) && (!input.verifiedOnly || p.verified))
    .map((p) => {
      const matches = uniqueMatches(rows.filter((r) => r.user_id === p.userId && gameById.has(r.bgg_id)))
        .map((r) => ({ ...gameById.get(r.bgg_id)!, reason: r.reason, price: r.price }));
      const sameStyle = myStyle !== null && p.playStyle === myStyle;
      return { ...p, matches, sameStyle, score: new Set(matches.map((m) => m.bggId)).size };
    })
    .filter((p) => p.matches.length)
    .sort((a, b) => b.score - a.score || Number(b.sameStyle) - Number(a.sameStyle) || a.displayName.localeCompare(b.displayName));
  return { people: found.slice(0, MAX_FOUND), total: found.length };
}
