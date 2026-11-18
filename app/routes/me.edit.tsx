import { useEffect, useState } from "react";
import { Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import { toast } from "sonner";
import { GamePicker } from "@/components/game-picker";
import { GameThumb } from "@/components/game-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Kind } from "@/db/schema";
import { DISTRICT_GROUPS } from "@/lib/districts";
import { HOT_SOURCE_LABEL } from "@/lib/hotness";
import { formatRupiah, suggestHandle } from "@/lib/validate";
import { addGame, importOwnedGames, removeGame, saveProfile, type ActionResult } from "@/lib/.server/card-actions";
import { loadCard, refreshHot } from "@/lib/.server/cards";
import { getDb } from "@/lib/.server/db";
import { requireViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/me.edit";

export const meta = () => [{ title: "Edit your card · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireViewer(request);
  const card = v.profile ? await loadCard(getDb(), { userId: v.user.id }) : null;
  return {
    isNew: !v.profile,
    defaults: {
      displayName: v.profile?.displayName ?? v.user.name ?? "",
      handle: v.profile?.handle ?? suggestHandle(v.user.email),
      district: v.profile?.district ?? "",
      bggUsername: v.profile?.bggUsername ?? "",
      bio: v.profile?.bio ?? "",
    },
    card,
  };
}

export async function action({ request }: Route.ActionArgs): Promise<ActionResult | Response> {
  const v = await requireViewer(request);
  const db = getDb();
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "profile") {
    const res = await saveProfile(db, v.user.id, form, v.profile);
    if (res.ok && !v.profile) throw redirect("/me/edit?welcome=1");
    return res;
  }
  if (!v.profile) return { ok: false, message: "Save your card details first." };
  if (intent === "add") return addGame(db, v.user.id, form);
  if (intent === "remove") return removeGame(db, v.user.id, form);
  if (intent === "import-owned") return importOwnedGames(db, v.user.id, v.profile.bggUsername);
  if (intent === "refresh-hot") {
    await refreshHot(db, v.user.id, v.profile.bggUsername);
    return { ok: true, message: "Hotness updated." };
  }
  return { ok: false, message: "Unknown action." };
}

function useResultToast(data: ActionResult | undefined) {
  useEffect(() => {
    if (!data) return;
    if (data.ok) toast.success(data.message);
    else if (!("fieldErrors" in data && data.fieldErrors)) toast.error(data.message);
  }, [data]);
}

const fieldClass = "h-11 w-full rounded-lg border border-input bg-input/30 px-3 text-base";

function ProfileForm({ defaults, isNew, result }: { defaults: Route.ComponentProps["loaderData"]["defaults"]; isNew: boolean; result?: ActionResult }) {
  const nav = useNavigation();
  const busy = nav.state !== "idle" && nav.formData?.get("intent") === "profile";
  const err = (k: string) => (result && !result.ok && result.fieldErrors?.[k]) || null;
  const field = (name: string, label: string, help: string, input: React.ReactNode) => (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {input}
      {err(name) ? <p className="text-sm text-destructive" role="alert">{err(name)}</p> : <p className="text-sm text-muted-foreground">{help}</p>}
    </div>
  );
  return (
    <Form method="post" encType="multipart/form-data" className="grid gap-5">
      <input type="hidden" name="intent" value="profile" />
      <div className="grid gap-5 sm:grid-cols-2">
        {field("displayName", "Name", "As friends know you, e.g. Malik.", <Input id="displayName" name="displayName" required maxLength={40} defaultValue={defaults.displayName} aria-invalid={!!err("displayName")} />)}
        {field("handle", "Handle", "Your link: /p/handle. Lowercase letters, numbers, _.", <Input id="handle" name="handle" required maxLength={20} defaultValue={defaults.handle} aria-invalid={!!err("handle")} />)}
        {field("district", "District", "Only the district shows. Never your address.",
          <select id="district" name="district" required defaultValue={defaults.district} className={fieldClass} aria-invalid={!!err("district")}>
            <option value="" disabled>Pick your district</option>
            {DISTRICT_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((d) => <option key={d} value={d}>{d}</option>)}
              </optgroup>
            ))}
          </select>)}
        {field("bggUsername", "BoardGameGeek username (optional)", "Links your BGG profile and fills Hotness from your plays.", <Input id="bggUsername" name="bggUsername" maxLength={40} defaultValue={defaults.bggUsername} aria-invalid={!!err("bggUsername")} />)}
      </div>
      {field("bio", "About you (optional)", "Up to 280 characters. What do you like to play?", <Textarea id="bio" name="bio" maxLength={280} rows={3} defaultValue={defaults.bio} aria-invalid={!!err("bio")} />)}
      {field("avatar", "Profile picture (optional)", "JPG, PNG or WebP, under 2 MB.", <Input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={!!err("avatar")} />)}
      {result && !result.ok && result.fieldErrors && <p role="alert" className="text-destructive">{result.message}</p>}
      <div className="flex justify-end">
        <Button size="lg" type="submit" disabled={busy}>{busy ? "Saving…" : isNew ? "Create my card" : "Save card"}</Button>
      </div>
    </Form>
  );
}

function GameList({ kind, title, help, games, max, withPrice }: {
  kind: Kind; title: string; help: string; games: { bggId: number; name: string; thumbnail: string | null; price?: number | null; condition?: string | null }[]; max: number; withPrice?: "sell" | "buy";
}) {
  const fetcher = useFetcher<ActionResult>();
  useResultToast(fetcher.data);
  const [pending, setPending] = useState<{ bggId: number; name: string } | null>(null);
  const full = games.length >= max;
  const add = (bggId: number, extra: Record<string, string> = {}) => fetcher.submit({ intent: "add", kind, bggId: String(bggId), ...extra }, { method: "post" });
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{help}</p>
      </div>
      {games.length > 0 && (
        <ul className="grid gap-2">
          {games.map((g) => (
            <li key={g.bggId} className="flex items-center gap-3">
              <GameThumb src={g.thumbnail} name={g.name} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{g.name}</span>
                {(g.price || g.condition) && (
                  <span className="block text-sm text-muted-foreground">{[g.price ? formatRupiah(g.price) : null, g.condition].filter(Boolean).join(" · ")}</span>
                )}
              </span>
              <Button variant="ghost" size="sm" disabled={fetcher.state !== "idle"} onClick={() => fetcher.submit({ intent: "remove", kind, bggId: String(g.bggId) }, { method: "post" })}>
                Remove<span className="sr-only"> {g.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-sm text-muted-foreground">This list is full. Remove a game to add another.</p>
      ) : pending ? (
        <form className="grid gap-3 rounded-lg bg-secondary/50 p-4" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          add(pending.bggId, { price: String(f.get("price") ?? ""), condition: String(f.get("condition") ?? "") });
          setPending(null);
        }}>
          <p className="font-medium">{pending.name}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${kind}-price`}>{withPrice === "sell" ? "Price (rupiah)" : "Budget (rupiah, optional)"}</Label>
              <Input id={`${kind}-price`} name="price" inputMode="numeric" placeholder="350000 or 350k" />
            </div>
            {withPrice === "sell" && (
              <div className="grid gap-2">
                <Label htmlFor={`${kind}-condition`}>Condition (optional)</Label>
                <Input id={`${kind}-condition`} name="condition" maxLength={40} placeholder="Like new, sleeved" />
              </div>
            )}
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button type="submit">Add to list</Button>
          </div>
        </form>
      ) : (
        <GamePicker label={`Add to ${title.toLowerCase()}`} help="Pick from the results to add it." disabled={fetcher.state !== "idle"}
          onPick={(h) => (withPrice ? setPending(h) : add(h.bggId))} />
      )}
    </section>
  );
}

export default function EditCard({ loaderData, actionData }: Route.ComponentProps) {
  const { isNew, defaults, card } = loaderData;
  const profileResult = actionData && !(actionData instanceof Response) ? (actionData as ActionResult) : undefined;
  useResultToast(profileResult?.ok ? profileResult : undefined);
  const hotFetcher = useFetcher<ActionResult>();
  const importFetcher = useFetcher<ActionResult>();
  useResultToast(hotFetcher.data);
  useResultToast(importFetcher.data);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{isNew ? "Set up your player card" : "Edit your card"}</h1>
          <p className="text-muted-foreground">{isNew ? "Members find you through this card. You can change everything later." : "Changes show on your card right away."}</p>
        </div>
        {!isNew && <Button asChild variant="outline"><Link to={`/p/${defaults.handle}`}>View my card</Link></Button>}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <ProfileForm defaults={defaults} isNew={isNew} result={profileResult} />
      </section>

      {card && (
        <>
          <GameList kind="favorite" title="Favorites" help="Your all-time favorite games. Up to 3." games={card.favorite} max={3} />

          <section className="grid gap-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">Hotness</h2>
            <p className="text-muted-foreground">Filled in for you: from sessions logged here once you have a few, until then from your BGG plays, or from what's hot on BGG.</p>
            {card.hot.length > 0 && <p>{card.hot.map((g) => g.name).join(", ")}</p>}
            {card.hotSource && <p className="text-sm text-muted-foreground">{HOT_SOURCE_LABEL[card.hotSource]}</p>}
            <div>
              <Button variant="outline" disabled={hotFetcher.state !== "idle"} onClick={() => hotFetcher.submit({ intent: "refresh-hot" }, { method: "post" })}>
                {hotFetcher.state !== "idle" ? "Updating…" : "Update hotness now"}
              </Button>
            </div>
          </section>

          <GameList kind="want" title="Want to play" help="Games you're looking for a table for." games={card.want} max={30} />
          <GameList kind="sell" title="Selling" help="Games you want to sell. Buyers contact you; the deal happens outside the site." games={card.sell} max={30} withPrice="sell" />
          <GameList kind="buy" title="Looking to buy" help="Games you want to buy. Sellers of these show up in Find." games={card.buy} max={30} withPrice="buy" />

          <section className="grid gap-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">Owned games</h2>
            <p className="text-muted-foreground">Not shown on your card. Used so people who want to play a game can find who owns it. You have {card.own.length}.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={importFetcher.state !== "idle" || !defaults.bggUsername} onClick={() => importFetcher.submit({ intent: "import-owned" }, { method: "post" })}>
                {importFetcher.state !== "idle" ? "Importing…" : "Import from my BGG collection"}
              </Button>
              {!defaults.bggUsername && <p className="self-center text-sm text-muted-foreground">Add your BGG username above to import.</p>}
            </div>
          </section>
          <GameList kind="own" title="Add an owned game by hand" help="For games not in your BGG collection." games={[]} max={300} />
        </>
      )}
    </div>
  );
}
