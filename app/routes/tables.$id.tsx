import { Form, Link, useNavigation } from "react-router";
import { GameThumb, PersonAvatar } from "@/components/game-thumb";
import { ReportButton } from "@/components/report-button";
import { ShareButtons } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/dates";
import { getDb } from "@/lib/.server/db";
import { joinTable, leaveTable, loadTable, setTableStatus } from "@/lib/.server/tables";
import { getViewer, requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/tables.$id";

// Public on purpose: a table link is shared in the WhatsApp group. Joining needs an account.
export async function loader({ request, params }: Route.LoaderArgs) {
  const t = await loadTable(getDb(), params.id);
  if (!t) throw new Response("Not found", { status: 404 });
  const v = await getViewer(request);
  return { t, viewerId: v?.profile ? v.user.id : null, origin: new URL(request.url).origin };
}

export const meta = ({ loaderData }: Route.MetaArgs) => {
  if (!loaderData) return [{ title: "Table not found · Bekasi Board Game Hub" }];
  const { t } = loaderData;
  const title = `${t.gameName}, ${formatWhen(t.startsAt)} · Bekasi Board Game Hub`;
  const description = `${t.players.length} of ${t.seats} seats taken${t.placeName ? ` at ${t.placeName}` : ""}. Join the table.`;
  return [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }];
};

export async function action({ request, params }: Route.ActionArgs) {
  const v = await requireMember(request);
  const intent = (await request.formData()).get("intent");
  const db = getDb();
  if (intent === "join") return joinTable(db, v.user.id, params.id);
  if (intent === "leave") return leaveTable(db, v.user.id, params.id);
  if (intent === "done") return setTableStatus(db, v.user.id, params.id, "done");
  if (intent === "cancel") return setTableStatus(db, v.user.id, params.id, "cancelled");
  return { ok: false as const, message: "Unknown action" };
}

export default function TablePage({ loaderData, actionData }: Route.ComponentProps) {
  const { t, viewerId } = loaderData;
  const busy = useNavigation().state !== "idle";
  const isHost = viewerId === t.hostId;
  const joined = viewerId ? t.players.some((p) => p.userId === viewerId) : false;
  const full = t.players.length >= t.seats;
  const started = t.startsAt <= Date.now();
  const btn = (intent: string, label: string, variant: "default" | "outline" | "destructive" = "default") => (
    <Form method="post"><input type="hidden" name="intent" value={intent} /><Button type="submit" variant={variant} size="lg" disabled={busy}>{label}</Button></Form>
  );

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link to={viewerId ? "/tables" : "/"} className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4">{viewerId ? "All tables" : "Home"}</Link>

      <header className="flex items-center gap-4">
        <GameThumb src={t.thumbnail} name={t.gameName} size={80} square />
        <div className="grid min-w-0 gap-1">
          <h1 className="text-3xl font-extrabold leading-tight"><Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" to={`/g/${t.bggId}`}>{t.gameName}</Link></h1>
          <p className="text-lg font-bold tabular-nums">{formatWhen(t.startsAt)} WIB</p>
          {t.status !== "open" && <p className="font-bold">{t.status === "cancelled" ? "Cancelled" : "Played"}</p>}
        </div>
      </header>

      <section className="panel grid gap-3 p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm font-semibold text-muted-foreground">Where</dt><dd className="font-semibold">{t.placeId ? <Link className="inline-flex min-h-11 items-center underline underline-offset-4" to={`/places/${t.placeId}`}>{t.placeName}</Link> : "Not decided yet"}{t.placeDistrict ? `, ${t.placeDistrict}` : ""}</dd></div>
          <div><dt className="text-sm font-semibold text-muted-foreground">Seats</dt><dd className="font-semibold tabular-nums">{t.players.length} of {t.seats} taken</dd></div>
        </dl>
        {t.note && <p className="whitespace-pre-line leading-relaxed">{t.note}</p>}
        {t.placeMap && <a className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4" href={t.placeMap} target="_blank" rel="noreferrer noopener">Open the map</a>}
      </section>

      <section aria-labelledby="who" className="grid gap-3">
        <h2 id="who" className="text-xl font-extrabold">Who's in</h2>
        <ul className="panel grid divide-y divide-line">
          {t.players.map((p) => (
            <li key={p.userId}>
              <Link to={`/p/${p.handle}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-muted">
                <PersonAvatar src={p.avatar} name={p.displayName} size={40} />
                <span className="font-bold">{p.displayName}</span>
                {p.userId === t.hostId && <span className="text-sm font-semibold text-muted-foreground">Host</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {actionData && !actionData.ok && <p role="alert" className="font-semibold text-destructive">{actionData.message}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {t.status === "open" && (
          !viewerId ? <Button asChild size="lg"><Link to={`/sign-in?next=${encodeURIComponent(`/tables/${t.id}`)}`}>Sign in to join</Link></Button>
          : isHost ? (
            <>
              {started ? btn("done", "We played it") : null}
              {btn("cancel", "Cancel table", "destructive")}
            </>
          ) : joined ? btn("leave", "Leave table", "outline")
          : full ? <p className="font-bold">This table is full</p>
          : btn("join", "Join table")
        )}
        {isHost && t.status === "done" && <Button asChild size="lg"><Link to={`/plays/new?table=${t.id}`}>Log the play</Link></Button>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <ShareButtons title={`${t.gameName} table, ${formatWhen(t.startsAt)}`} path={`/tables/${t.id}`} />
        {viewerId && !isHost && <ReportButton type="table" id={t.id} what="this table" />}
      </div>
    </div>
  );
}
