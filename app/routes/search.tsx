import { asc, eq, sql } from "drizzle-orm";
import { Form, Link } from "react-router";
import { GameThumb, PersonAvatar } from "@/components/game-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { game, place, profile, user } from "@/db/schema";
import { likePattern } from "@/lib/validate";
import { searchGames } from "@/lib/.server/bgg";
import { personCols, toPerson } from "@/lib/.server/cards";
import { getDb } from "@/lib/.server/db";
import { requireViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/search";

export const meta = () => [{ title: "Search · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireViewer(request); // BGG lookups and the member list are for signed-in people
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return { q, searched: false as const };
  const db = getDb();
  const pat = likePattern(q);
  const [people, games, places] = await Promise.all([
    db.select(personCols).from(profile).innerJoin(user, eq(user.id, profile.userId))
      .where(sql`${profile.displayName} LIKE ${pat} ESCAPE '\\' OR ${profile.handle} LIKE ${pat} ESCAPE '\\'`).orderBy(asc(profile.displayName)).limit(10),
    db.select({ bggId: game.bggId, name: game.name, year: game.year, thumbnail: game.thumbnail }).from(game)
      .where(sql`${game.name} LIKE ${pat} ESCAPE '\\'`).orderBy(asc(game.name)).limit(10),
    db.select({ id: place.id, name: place.name, district: place.district }).from(place)
      .where(sql`${place.name} LIKE ${pat} ESCAPE '\\'`).orderBy(asc(place.name)).limit(10),
  ]);
  let more: { bggId: number; name: string; year: number | null }[] = [];
  let bggDown = false;
  if (v.profile) {
    try {
      const have = new Set(games.map((g) => g.bggId));
      more = (await searchGames(q)).filter((h) => !have.has(h.bggId)).slice(0, 8);
    } catch { bggDown = true; }
  }
  return { q, searched: true as const, people: people.map(toPerson), games, places, more, bggDown };
}

export default function Search({ loaderData }: Route.ComponentProps) {
  const d = loaderData;
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-3xl font-extrabold">Search</h1>
      <Form method="get" role="search" className="flex items-end gap-2">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="q">Members, games and places</Label>
          <Input id="q" name="q" type="search" defaultValue={d.q} placeholder="e.g. Brass, Raka, a cafe" autoComplete="off" />
        </div>
        <Button type="submit">Search</Button>
      </Form>

      {!d.searched ? (
        d.q ? <p className="text-muted-foreground">Type at least 2 letters.</p> : null
      ) : d.people.length + d.games.length + d.places.length + d.more.length === 0 ? (
        <section className="panel grid gap-2 p-6"><h2 className="text-lg font-extrabold">No results for "{d.q}"</h2><p className="text-muted-foreground">Check the spelling, or try a shorter word.</p></section>
      ) : (
        <>
          {d.people.length > 0 && (
            <section aria-labelledby="s-people" className="grid gap-2">
              <h2 id="s-people" className="text-xl font-extrabold">Members</h2>
              <ul className="panel grid divide-y divide-line">
                {d.people.map((p) => (
                  <li key={p.userId}><Link to={`/p/${p.handle}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-muted"><PersonAvatar src={p.avatar} name={p.displayName} size={40} /><span className="font-bold">{p.displayName}</span><span className="text-sm text-muted-foreground">@{p.handle} · {p.district}</span></Link></li>
                ))}
              </ul>
            </section>
          )}
          {d.games.length > 0 && (
            <section aria-labelledby="s-games" className="grid gap-2">
              <h2 id="s-games" className="text-xl font-extrabold">Games</h2>
              <ul className="panel grid divide-y divide-line">
                {d.games.map((g) => (
                  <li key={g.bggId}><Link to={`/g/${g.bggId}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-muted"><GameThumb src={g.thumbnail} name={g.name} size={40} /><span className="font-bold">{g.name}</span><span className="text-sm text-muted-foreground">{g.year ?? ""}</span></Link></li>
                ))}
              </ul>
            </section>
          )}
          {d.places.length > 0 && (
            <section aria-labelledby="s-places" className="grid gap-2">
              <h2 id="s-places" className="text-xl font-extrabold">Places</h2>
              <ul className="panel grid divide-y divide-line">
                {d.places.map((p) => <li key={p.id}><Link to={`/places/${p.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2 hover:bg-muted"><span className="font-bold">{p.name}</span><span className="text-sm text-muted-foreground">{p.district}</span></Link></li>)}
              </ul>
            </section>
          )}
          {d.more.length > 0 && (
            <section aria-labelledby="s-bgg" className="grid gap-2">
              <h2 id="s-bgg" className="text-xl font-extrabold">More games from BoardGameGeek</h2>
              <ul className="panel grid divide-y divide-line">
                {d.more.map((g) => <li key={g.bggId}><Link to={`/g/${g.bggId}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 hover:bg-muted"><span className="font-semibold">{g.name}</span><span className="text-sm text-muted-foreground">{g.year ?? ""}</span></Link></li>)}
              </ul>
            </section>
          )}
          {d.bggDown && <p className="text-sm text-muted-foreground">BoardGameGeek isn't answering, so only games already on the hub are shown.</p>}
        </>
      )}
    </div>
  );
}
