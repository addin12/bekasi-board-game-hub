import { useEffect, useState } from "react";
import { Link, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import { GameThumb } from "@/components/game-thumb";
import { ReportButton } from "@/components/report-button";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";
import { getDb } from "@/lib/.server/db";
import { confirmPlay, deletePlay, loadPlay, removeMeFromPlay } from "@/lib/.server/plays";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/plays.$id";

export const meta = () => [{ title: "Play · Bekasi Board Game Hub" }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const v = await requireMember(request);
  const p = await loadPlay(getDb(), params.id);
  if (!p) throw new Response("Not found", { status: 404 });
  return { play: p, viewerId: v.user.id, isAdmin: v.isAdmin };
}

export async function action({ request, params }: Route.ActionArgs) {
  const v = await requireMember(request);
  const db = getDb();
  const intent = (await request.formData()).get("intent");
  if (intent === "confirm") return confirmPlay(db, v.user.id, params.id);
  if (intent === "remove-me") {
    await removeMeFromPlay(db, v.user.id, params.id);
    throw redirect("/feed");
  }
  if (intent === "delete") {
    const res = await deletePlay(db, v.user.id, params.id, v.isAdmin);
    if (res.ok) throw redirect("/feed");
    return res;
  }
  return { ok: false as const, message: "Unknown action" };
}

export default function PlayPage({ loaderData }: Route.ComponentProps) {
  const { play, viewerId, isAdmin } = loaderData;
  const f = useFetcher<{ ok: boolean; message?: string }>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (f.data && !f.data.ok) toast.error(f.data.message ?? "We could not save that change. Try again."); }, [f.data]);
  const me = play.players.find((p) => p.userId === viewerId);
  const busy = f.state !== "idle";
  const act = (intent: string) => f.submit({ intent }, { method: "post" });

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link to="/feed" className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4">Back to the feed</Link>
      <header className="flex items-center gap-4">
        <GameThumb src={play.thumbnail} name={play.gameName} size={72} />
        <div className="grid min-w-0 gap-1">
          <h1 className="text-3xl font-extrabold leading-tight"><Link to={`/g/${play.bggId}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{play.gameName}</Link></h1>
          <p className="font-semibold text-muted-foreground tabular-nums">
            {formatDay(play.playedOn)}
            {play.placeName && play.placeId && <> · <Link className="underline underline-offset-4" to={`/places/${play.placeId}`}>{play.placeName}</Link></>}
            {play.durationMin ? ` · ${play.durationMin} min` : ""}
          </p>
        </div>
      </header>

      {me && !me.confirmed && (
        <section aria-label="Confirm this play" className="panel grid gap-3 p-5">
          <h2 className="text-lg font-extrabold">Were you there?</h2>
          <p className="text-muted-foreground">It only counts for you once you confirm</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => act("confirm")}>Yes, I played</Button>
            <Button variant="outline" disabled={busy} onClick={() => act("remove-me")}>That wasn't me</Button>
          </div>
        </section>
      )}

      <section aria-labelledby="players" className="grid gap-3">
        <h2 id="players" className="text-xl font-extrabold">Players</h2>
        <ul className="panel grid divide-y divide-line">
          {play.players.map((p) => (
            <li key={p.rowId} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
              <span className="font-bold">
                {p.handle ? <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" to={`/p/${p.handle}`}>{p.name}</Link> : p.name}
                {!p.userId && <span className="ml-2 text-sm font-medium text-muted-foreground">guest</span>}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 text-sm font-semibold tabular-nums">
                {p.winner && <span>Winner</span>}
                {p.score !== null && <span>{p.score.toLocaleString("id-ID")} points</span>}
                {!p.confirmed && <span className="text-muted-foreground">Not confirmed yet</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline"><Link to={`/plays/new?game=${play.bggId}`}>Log another play of this game</Link></Button>
        <div className="flex flex-wrap items-center gap-x-4">
          {me?.confirmed && (
            <button type="button" disabled={busy} onClick={() => act("remove-me")} className="inline-flex h-11 items-center text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-ink">Remove me from this play</button>
          )}
          {(play.loggedBy === viewerId || isAdmin) && (confirmDelete ? (
            <span className="flex items-center gap-1">
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("delete")}>Delete for everyone</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-11 items-center text-sm font-semibold text-destructive underline underline-offset-4">Delete play</button>
          ))}
          {play.loggedBy !== viewerId && <ReportButton type="play" id={play.id} what="this play" />}
        </div>
      </div>
    </div>
  );
}
