import { Link } from "react-router";
import { GameThumb } from "@/components/game-thumb";
import { MeetTabs } from "@/components/meet-tabs";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/dates";
import { getDb } from "@/lib/.server/db";
import { listTables } from "@/lib/.server/tables";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/tables";

export const meta = () => [{ title: "Tables · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireMember(request);
  return { tables: await listTables(getDb()) };
}

export default function Tables({ loaderData }: Route.ComponentProps) {
  const { tables } = loaderData;
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Tables</h1>
        <Button asChild><Link to="/tables/new">Open a table</Link></Button>
      </div>
      <MeetTabs />
      {tables.length === 0 ? (
        <section className="panel grid gap-3 p-6">
          <h2 className="text-lg font-extrabold">No tables open</h2>
          <p className="text-muted-foreground">Pick a game, a time and a place, and others can join</p>
          <Button asChild variant="outline" className="w-fit"><Link to="/tables/new">Open the first table</Link></Button>
        </section>
      ) : (
        <ul className="panel grid divide-y divide-line">
          {tables.map((t) => {
            const left = t.seats - Number(t.joined);
            return (
              <li key={t.id}>
                <Link to={`/tables/${t.id}`} className="flex min-h-20 items-center gap-4 px-4 py-3 hover:bg-muted">
                  <GameThumb src={t.thumbnail} name={t.gameName} size={52} />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="font-extrabold">{t.gameName}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatWhen(t.startsAt)}{t.placeName ? ` · ${t.placeName}` : ""}</span>
                    <span className="text-sm text-muted-foreground">Hosted by {t.hostName}</span>
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums">{left > 0 ? `${left} ${left === 1 ? "seat" : "seats"} left` : "Full"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
