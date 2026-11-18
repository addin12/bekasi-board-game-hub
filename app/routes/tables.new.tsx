import { eq } from "drizzle-orm";
import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";
import { Field, selectClass } from "@/components/field";
import { GamePicker } from "@/components/game-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { game } from "@/db/schema";
import { toInputValue } from "@/lib/dates";
import { parseStart, tableSchema } from "@/lib/validate";
import { getDb } from "@/lib/.server/db";
import { listPlaces } from "@/lib/.server/places";
import { createTable } from "@/lib/.server/tables";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/tables.new";

export const meta = () => [{ title: "Open a table · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireMember(request);
  const db = getDb();
  const gameId = Number(new URL(request.url).searchParams.get("game")) || null;
  const [g] = gameId ? await db.select({ bggId: game.bggId, name: game.name, maxPlayers: game.maxPlayers }).from(game).where(eq(game.bggId, gameId)).limit(1) : [];
  const places = (await listPlaces(db)).map((p) => ({ id: p.id, name: p.name, district: p.district }));
  // Tomorrow evening is the most likely time; the form is in Jakarta time.
  const start = toInputValue(Date.now() + 86400_000).slice(0, 10) + "T19:00";
  return { preset: g ?? null, places, start };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  const f = await request.formData();
  const parsed = tableSchema().safeParse({
    bggId: Number(f.get("bggId")), placeId: String(f.get("placeId") ?? "") || null, startsAt: parseStart(String(f.get("startsAt") ?? "")),
    seats: Number(f.get("seats")), note: String(f.get("note") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false as const, message: issue.path[0] === "startsAt" && issue.code === "invalid_type" ? "Pick the date and time" : issue.message };
  }
  const res = await createTable(getDb(), v.user.id, parsed.data);
  if (res.ok) throw redirect(`/tables/${res.id}`);
  return res;
}

export default function NewTable({ loaderData, actionData }: Route.ComponentProps) {
  const { preset, places, start } = loaderData;
  const busy = useNavigation().state !== "idle";
  const [picked, setPicked] = useState<{ bggId: number; name: string } | null>(preset ? { bggId: preset.bggId, name: preset.name } : null);
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-3xl font-extrabold">Open a table</h1>
      <Form method="post" className="panel grid gap-5 p-5">
        <input type="hidden" name="bggId" value={picked?.bggId ?? ""} />
        {picked ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-muted-foreground">Game</p><p className="text-lg font-extrabold">{picked.name}</p></div>
            <Button type="button" variant="outline" size="sm" onClick={() => setPicked(null)}>Change game</Button>
          </div>
        ) : (
          <GamePicker label="Game" onPick={(h) => setPicked({ bggId: h.bggId, name: h.name })} />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="startsAt" label="When" help="Jakarta time"><Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={start} /></Field>
          <Field id="seats" label="Seats" help="Including you"><Input id="seats" name="seats" type="number" required min={2} max={12} inputMode="numeric" defaultValue={preset?.maxPlayers && preset.maxPlayers >= 2 ? Math.min(preset.maxPlayers, 12) : 4} /></Field>
          <Field id="placeId" label="Place (optional)" className="sm:col-span-2" help={<>Not listed? <Link className="font-semibold underline underline-offset-4" to="/places/new">Add the place</Link>.</>}>
            <select id="placeId" name="placeId" className={selectClass} defaultValue="">
              <option value="">No place yet</option>
              {places.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.district})</option>)}
            </select>
          </Field>
          <Field id="note" label="Note (optional)" className="sm:col-span-2"><Textarea id="note" name="note" maxLength={200} rows={2} placeholder="Beginners welcome, bring snacks, rules explained" /></Field>
        </div>
        {actionData && !actionData.ok && <p role="alert" className="font-semibold text-destructive">{actionData.message}</p>}
        <div className="flex justify-end"><Button size="lg" type="submit" disabled={busy || !picked}>{busy ? "Opening…" : "Open table"}</Button></div>
      </Form>
    </div>
  );
}
