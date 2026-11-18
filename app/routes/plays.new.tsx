import { eq } from "drizzle-orm";
import { X } from "lucide-react";
import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { Field, selectClass } from "@/components/field";
import { GamePicker } from "@/components/game-picker";
import { PeoplePicker, type PickedPerson } from "@/components/people-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { game } from "@/db/schema";
import { todayWib } from "@/lib/dates";
import { playSchema } from "@/lib/validate";
import { getDb } from "@/lib/.server/db";
import { createPlay } from "@/lib/.server/plays";
import { listPlaces } from "@/lib/.server/places";
import { loadTable } from "@/lib/.server/tables";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/plays.new";

export const meta = () => [{ title: "Log a play · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireMember(request);
  const db = getDb();
  const sp = new URL(request.url).searchParams;
  const tableId = sp.get("table");
  const gameId = Number(sp.get("game")) || null;
  let preset: { game: { bggId: number; name: string } | null; placeId: string | null; players: PickedPerson[]; tableId: string | null } = { game: null, placeId: null, players: [], tableId: null };
  if (tableId) {
    const t = await loadTable(db, tableId);
    if (t && t.hostId === v.user.id) {
      preset = { game: { bggId: t.bggId, name: t.gameName }, placeId: t.placeId, tableId: t.id,
        players: t.players.filter((p) => p.userId !== v.user.id).map((p) => ({ userId: p.userId, handle: p.handle, displayName: p.displayName, avatar: p.avatar })) };
    }
  } else if (gameId) {
    const [g] = await db.select({ bggId: game.bggId, name: game.name }).from(game).where(eq(game.bggId, gameId)).limit(1);
    if (g) preset.game = g;
  }
  const places = (await listPlaces(db)).map((p) => ({ id: p.id, name: p.name, district: p.district }));
  return { me: { userId: v.user.id, name: v.profile.displayName }, today: todayWib(), places, preset };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  let raw: unknown;
  try { raw = JSON.parse(String((await request.formData()).get("payload") ?? "")); } catch { return { ok: false as const, message: "That didn't send properly. Try again." }; }
  const parsed = playSchema().safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const res = await createPlay(getDb(), v.user.id, parsed.data);
  if (res.ok) throw redirect(`/plays/${res.id}`);
  return res;
}

type Row = { key: string; userId?: string; guest?: string; name: string; handle?: string; winner: boolean; score: string };

export default function LogPlay({ loaderData, actionData }: Route.ComponentProps) {
  const { me, today, places, preset } = loaderData;
  const busy = useNavigation().state !== "idle";
  const [picked, setPicked] = useState(preset.game);
  const [date, setDate] = useState(today);
  const [placeId, setPlaceId] = useState(preset.placeId ?? "");
  const [duration, setDuration] = useState("");
  const [guest, setGuest] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { key: me.userId, userId: me.userId, name: me.name, winner: false, score: "" },
    ...preset.players.map((p) => ({ key: p.userId, userId: p.userId, name: p.displayName, handle: p.handle, winner: false, score: "" })),
  ]);
  const patch = (key: string, change: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const addGuest = () => {
    const name = guest.trim();
    if (!name || rows.length >= 12) return;
    setRows((rs) => [...rs, { key: `g-${rs.length}-${name}`, guest: name, name, winner: false, score: "" }]);
    setGuest("");
  };
  const payload = JSON.stringify({
    bggId: picked?.bggId ?? 0, playedOn: date, placeId: placeId || null, durationMin: duration ? Number(duration) : null,
    players: rows.map((r) => ({ ...(r.userId ? { userId: r.userId } : { guest: r.guest }), winner: r.winner, score: r.score.trim() === "" ? null : Number(r.score) })),
  });

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-3xl font-extrabold">Log a play</h1>
      <Form method="post" className="grid gap-6">
        <input type="hidden" name="payload" value={payload} />
        <section className="panel grid gap-5 p-5">
          {picked ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-semibold text-muted-foreground">Game</p><p className="text-lg font-extrabold">{picked.name}</p></div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPicked(null)}>Change game</Button>
            </div>
          ) : (
            <GamePicker label="Game" onPick={(h) => setPicked({ bggId: h.bggId, name: h.name })} />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="played-on" label="Date"><Input id="played-on" type="date" required value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field id="duration" label="Minutes (optional)"><Input id="duration" type="number" min={1} max={1440} inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
            <Field id="place" label="Place (optional)" className="sm:col-span-2" help={<>Not listed? <Link className="font-semibold underline underline-offset-4" to="/places/new">Add the place</Link>.</>}>
              <select id="place" className={selectClass} value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
                <option value="">No place</option>
                {places.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.district})</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section aria-labelledby="players" className="panel grid gap-5 p-5">
          <div className="grid gap-1">
            <h2 id="players" className="text-xl font-extrabold">Who played</h2>
            <p className="text-sm text-muted-foreground">Members you add are asked to confirm. Guests count straight away.</p>
          </div>
          <ul className="grid gap-3">
            {rows.map((r) => (
              <li key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto_6rem_auto]">
                <span className="min-w-0 font-bold">{r.name}{r.handle && <span className="ml-2 text-sm font-medium text-muted-foreground">@{r.handle}</span>}{r.guest && <span className="ml-2 text-sm font-medium text-muted-foreground">guest</span>}{r.userId === me.userId && <span className="ml-2 text-sm font-medium text-muted-foreground">you</span>}</span>
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="size-5" checked={r.winner} onChange={(e) => patch(r.key, { winner: e.target.checked })} />Won</label>
                <label className="col-span-1 grid gap-1 text-sm font-semibold sm:col-span-1"><span className="sr-only">Score for {r.name}</span>
                  <Input type="number" inputMode="numeric" placeholder="Score" aria-label={`Score for ${r.name}`} value={r.score} onChange={(e) => patch(r.key, { score: e.target.value })} />
                </label>
                {r.userId === me.userId ? <span /> : (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><X className="size-5" aria-hidden /><span className="sr-only">Remove {r.name}</span></Button>
                )}
              </li>
            ))}
          </ul>
          {rows.length < 12 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <PeoplePicker label="Add a member" exclude={rows.filter((r) => r.userId).map((r) => r.userId!)}
                onPick={(p) => setRows((rs) => (rs.length < 12 ? [...rs, { key: p.userId, userId: p.userId, name: p.displayName, handle: p.handle, winner: false, score: "" }] : rs))} />
              <div className="grid content-start gap-2">
                <label htmlFor="guest" className="text-sm font-semibold">Add a guest</label>
                <div className="flex gap-2">
                  <Input id="guest" value={guest} maxLength={30} placeholder="Name" onChange={(e) => setGuest(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGuest(); } }} />
                  <Button type="button" variant="outline" onClick={addGuest}>Add</Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {actionData && !actionData.ok && <p role="alert" className="font-semibold text-destructive">{actionData.message}</p>}
        <div className="flex justify-end"><Button size="lg" type="submit" disabled={busy || !picked}>{busy ? "Saving…" : "Save play"}</Button></div>
      </Form>
    </div>
  );
}
