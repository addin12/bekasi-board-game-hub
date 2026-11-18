import { env } from "cloudflare:workers";
import { inArray, sql } from "drizzle-orm";
import { game } from "@/db/schema";
import { parseCollection, parseHot, parsePlays, parseSearch, parseThings, type GameInfo, type Play, type SearchHit } from "@/lib/bgg-parse";
import type { Db } from "./db";

const BASE = "https://boardgamegeek.com/xmlapi2";
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export class BggBusy extends Error {}

/** One BGG call. Public responses go through the edge cache so repeat lookups never reach BGG. */
async function bgg(path: string, cacheSeconds: number): Promise<string> {
  const url = `${BASE}${path}`;
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(url);
  if (cacheSeconds > 0) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit.text();
  }
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${env.BGG_TOKEN}`, "user-agent": "BekasiBoardGameHub/0.1" },
  });
  // BGG answers 202 while it prepares a collection, 429 when we ask too often.
  if (res.status === 202 || res.status === 429) throw new BggBusy(String(res.status));
  if (!res.ok) throw new Error(`BGG answered ${res.status} for ${path.split("?")[0]}`);
  const body = await res.text();
  if (cacheSeconds > 0) {
    await cache.put(cacheKey, new Response(body, { headers: { "cache-control": `max-age=${cacheSeconds}` } }));
  }
  return body;
}

export async function searchGames(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  const hits = parseSearch(await bgg(`/search?type=boardgame&query=${encodeURIComponent(q)}`, 86400));
  // Exact and prefix matches first, then BGG's order.
  const lower = q.toLowerCase();
  const rank = (h: SearchHit) => (h.name.toLowerCase() === lower ? 0 : h.name.toLowerCase().startsWith(lower) ? 1 : 2);
  return hits.sort((a, b) => rank(a) - rank(b)).slice(0, 20);
}

/** Makes sure these games are in D1 (fetching missing or month-old ones, 20 per BGG call). */
export async function ensureGames(db: Db, ids: number[]): Promise<void> {
  const unique = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  if (!unique.length) return;
  const have = await db.select({ id: game.bggId, at: game.fetchedAt }).from(game).where(inArray(game.bggId, unique));
  const fresh = new Set(have.filter((g) => Date.now() - g.at.getTime() < STALE_MS).map((g) => g.id));
  const missing = unique.filter((id) => !fresh.has(id));
  for (let i = 0; i < missing.length; i += 20) {
    const batch = missing.slice(i, i + 20);
    const infos = parseThings(await bgg(`/thing?stats=1&id=${batch.join(",")}`, 0));
    await upsertGames(db, infos);
  }
}

async function upsertGames(db: Db, infos: GameInfo[]) {
  for (const g of infos) {
    await db
      .insert(game)
      .values({ ...g, fetchedAt: new Date() })
      .onConflictDoUpdate({
        target: game.bggId,
        set: {
          name: g.name, year: g.year, thumbnail: g.thumbnail, image: g.image, minPlayers: g.minPlayers,
          maxPlayers: g.maxPlayers, playingTime: g.playingTime, weight: g.weight, fetchedAt: sql`(unixepoch() * 1000)`,
        },
      });
  }
}

export const hotList = async () => parseHot(await bgg("/hot?type=boardgame", 3600 * 6));

export async function recentPlays(username: string, days = 90): Promise<Play[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  return parsePlays(await bgg(`/plays?username=${encodeURIComponent(username)}&mindate=${since}`, 3600));
}

/** Owned base games, saved to the game cache. Throws BggBusy on the first call while BGG builds the list. */
export async function importOwned(db: Db, username: string, limit = 300): Promise<number[]> {
  const games = parseCollection(await bgg(`/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame&excludesubtype=boardgameexpansion`, 0)).slice(0, limit);
  // Insert only unknown games: collection rows lack player counts, so never overwrite fuller /thing data.
  const stmts = games.map((g) => db.insert(game).values({ ...g, fetchedAt: new Date(0) }).onConflictDoNothing());
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50) as [any, ...any[]]);
  return games.map((g) => g.bggId);
}
