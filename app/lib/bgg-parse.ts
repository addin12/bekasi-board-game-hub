import { XMLParser } from "fast-xml-parser";

// Pure parsers for BGG XML API2 responses. Network code lives in .server/bgg.ts.

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => ["item", "name", "play", "link"].includes(name),
});

export type GameInfo = {
  bggId: number;
  name: string;
  year: number | null;
  thumbnail: string | null;
  image: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  weight: number | null;
};

export type SearchHit = { bggId: number; name: string; year: number | null };
export type Play = { bggId: number; name: string; date: string; quantity: number };

const num = (v: unknown): number | null => {
  const n = Number(typeof v === "object" && v !== null ? (v as { value?: unknown }).value : v);
  return Number.isFinite(n) && n !== 0 ? n : null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const primaryName = (names: Array<{ type?: string; value?: string }> = []) =>
  (names.find((n) => n.type === "primary") ?? names[0])?.value ?? "";

/** /thing?id=..&stats=1 */
export function parseThings(xml: string): GameInfo[] {
  const items: any[] = parser.parse(xml)?.items?.item ?? [];
  return items
    .filter((i) => i.type === "boardgame" || i.type === "boardgameexpansion")
    .map((i) => ({
      bggId: Number(i.id),
      name: primaryName(i.name),
      year: num(i.yearpublished),
      thumbnail: str(i.thumbnail),
      image: str(i.image),
      minPlayers: num(i.minplayers),
      maxPlayers: num(i.maxplayers),
      playingTime: num(i.playingtime),
      weight: num(i.statistics?.ratings?.averageweight),
    }))
    .filter((g) => Number.isInteger(g.bggId) && g.bggId > 0 && g.name);
}

/** /search?query=..&type=boardgame */
export function parseSearch(xml: string): SearchHit[] {
  const items: any[] = parser.parse(xml)?.items?.item ?? [];
  return items
    .map((i) => ({ bggId: Number(i.id), name: primaryName(i.name), year: num(i.yearpublished) }))
    .filter((h) => Number.isInteger(h.bggId) && h.name);
}

/** /hot?type=boardgame → ids in rank order */
export function parseHot(xml: string): number[] {
  const items: any[] = parser.parse(xml)?.items?.item ?? [];
  return items.map((i) => Number(i.id)).filter((id) => Number.isInteger(id) && id > 0);
}

/** /collection?username=..&own=1 → owned games (name, year and pictures come with it, so no extra /thing calls). */
export function parseCollection(xml: string): GameInfo[] {
  const items: any[] = parser.parse(xml)?.items?.item ?? [];
  const seen = new Set<number>();
  const out: GameInfo[] = [];
  for (const i of items) {
    const bggId = Number(i.objectid);
    const name = (Array.isArray(i.name) ? i.name[0] : i.name)?.["#text"] ?? (typeof i.name?.[0] === "string" ? i.name[0] : "");
    if (!Number.isInteger(bggId) || bggId <= 0 || !name || seen.has(bggId)) continue;
    seen.add(bggId);
    out.push({
      bggId, name: String(name), year: num(i.yearpublished), thumbnail: str(i.thumbnail), image: str(i.image),
      minPlayers: null, maxPlayers: null, playingTime: null, weight: null,
    });
  }
  return out;
}

/** /plays?username=..&mindate=.. */
export function parsePlays(xml: string): Play[] {
  const plays: any[] = parser.parse(xml)?.plays?.play ?? [];
  return plays
    .map((p) => {
      const item = Array.isArray(p.item) ? p.item[0] : p.item;
      return { bggId: Number(item?.objectid), name: String(item?.name ?? ""), date: String(p.date ?? ""), quantity: Number(p.quantity) || 1 };
    })
    .filter((p) => Number.isInteger(p.bggId) && p.bggId > 0);
}
