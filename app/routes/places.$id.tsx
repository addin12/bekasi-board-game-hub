import { Link } from "react-router";
import { GameThumb } from "@/components/game-thumb";
import { ReportButton } from "@/components/report-button";
import { ShareButtons } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { formatDay, formatWhen } from "@/lib/dates";
import { getDb } from "@/lib/.server/db";
import { loadPlace } from "@/lib/.server/places";
import { getViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/places.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  const found = await loadPlace(getDb(), params.id);
  if (!found) throw new Response("Not found", { status: 404 });
  const v = await getViewer(request);
  return { ...found, member: Boolean(v?.profile) };
}

export const meta = ({ loaderData }: Route.MetaArgs) => {
  if (!loaderData) return [{ title: "Place not found · Bekasi Board Game Hub" }];
  const { place } = loaderData;
  const description = `${place.name} in ${place.district}${place.address ? `, ${place.address}` : ""}. A place to play board games in Bekasi.`;
  return [{ title: `${place.name} · Bekasi Board Game Hub` }, { name: "description", content: description }, { property: "og:title", content: place.name }, { property: "og:description", content: description }];
};

export default function PlacePage({ loaderData }: Route.ComponentProps) {
  const { place, tables, recent, member } = loaderData;
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link to="/places" className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4">All places</Link>
      <header className="grid gap-1">
        <h1 className="text-3xl font-extrabold">{place.name}</h1>
        <p className="font-semibold text-muted-foreground">{place.district}{place.address ? `, ${place.address}` : ""}</p>
      </header>

      <section className="panel grid gap-3 p-5">
        {place.note ? <p className="whitespace-pre-line leading-relaxed">{place.note}</p> : <p className="text-muted-foreground">No details added yet.</p>}
        {place.mapUrl && <a className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4" href={place.mapUrl} target="_blank" rel="noreferrer noopener">Open the map</a>}
      </section>

      <section aria-labelledby="open-tables" className="grid gap-3">
        <h2 id="open-tables" className="text-xl font-extrabold">Tables here</h2>
        {tables.length === 0 ? (
          <div className="panel grid gap-3 p-5">
            <p className="text-muted-foreground">Nothing planned here yet.</p>
            {member && <Button asChild variant="outline" className="w-fit"><Link to="/tables/new">Open a table</Link></Button>}
          </div>
        ) : (
          <ul className="panel grid divide-y divide-line">
            {tables.map((t) => (
              <li key={t.id}>
                <Link to={`/tables/${t.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-muted">
                  <GameThumb src={t.thumbnail} name={t.gameName} size={44} />
                  <span className="grid gap-0.5"><span className="font-bold">{t.gameName}</span><span className="text-sm text-muted-foreground tabular-nums">{formatWhen(t.startsAt)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent" className="grid gap-3">
          <h2 id="recent" className="text-xl font-extrabold">Recently played here</h2>
          <ul className="panel grid divide-y divide-line">
            {recent.map((p) => <li key={p.id} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2"><span className="font-semibold">{p.gameName}</span><span className="text-sm text-muted-foreground tabular-nums">{formatDay(p.playedOn)}</span></li>)}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <ShareButtons title={place.name} path={`/places/${place.id}`} />
        {member && <ReportButton type="place" id={place.id} what="this place (wrong details or doesn't exist)" />}
      </div>
    </div>
  );
}
