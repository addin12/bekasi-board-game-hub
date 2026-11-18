import { env } from "cloudflare:workers";
import { inArray } from "drizzle-orm";
import { game, place, profile, userGame } from "@/db/schema";
import { isSandboxOn } from "@/lib/sandbox";
import { getDb } from "@/lib/.server/db";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Public pages only: cards, games that members have on their cards, places, and the plain pages.
export async function loader({ request }: { request: Request }) {
  if (isSandboxOn(env.SANDBOX)) return new Response("Not found", { status: 404 });
  const origin = new URL(request.url).origin;
  const db = getDb();
  const [members, games, places] = await Promise.all([
    db.select({ h: profile.handle }).from(profile).limit(2000),
    db.select({ id: game.bggId }).from(game).where(inArray(game.bggId, db.select({ id: userGame.bggId }).from(userGame))).limit(2000),
    db.select({ id: place.id }).from(place).limit(500),
  ]);
  const urls = [
    "/", "/places", "/privacy", "/terms", "/safety",
    ...members.map((m) => `/p/${m.h}`), ...games.map((g) => `/g/${g.id}`), ...places.map((p) => `/places/${p.id}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(origin + u)}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
