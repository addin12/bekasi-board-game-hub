import { useEffect, useState } from "react";
import { Flame, Heart, MessageCircle, ShoppingBag } from "lucide-react";
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
import { addGame, importOwnedGames, markSold, removeGame, saveProfile, type ActionResult } from "@/lib/.server/card-actions";
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
  if (!v.profile) return { ok: false, message: "Save your card details first" };
  if (intent === "add") return addGame(db, v.user.id, form);
  if (intent === "remove") return removeGame(db, v.user.id, form);
  if (intent === "sold") return markSold(db, v.user.id, form);
  if (intent === "import-owned") return importOwnedGames(db, v.user.id, v.profile.bggUsername);
  if (intent === "refresh-hot") {
    await refreshHot(db, v.user.id, v.profile.bggUsername);
    return { ok: true, message: "Hotness updated" };
  }
  return { ok: false, message: "Unknown action" };
}

function useResultToast(data: ActionResult | undefined) {
  useEffect(() => {
    if (!data) return;
    if (data.ok) toast.success(data.message);
    else if (!("fieldErrors" in data && data.fieldErrors)) toast.error(data.message);
  }, [data]);
}

const fieldClass = "h-11 w-full rounded-lg border-2 border-input bg-white px-3 text-base";
const fill = { fill: "currentColor" } as const;

// ---------- Profile ----------

function ProfileForm({ defaults, isNew, result }: { defaults: Route.ComponentProps["loaderData"]["defaults"]; isNew: boolean; result?: ActionResult }) {
  const nav = useNavigation();
  const busy = nav.state !== "idle" && nav.formData?.get("intent") === "profile";
  const [username, setUsername] = useState(defaults.handle);
  const err = (k: string) => (result && !result.ok && result.fieldErrors?.[k]) || null;
  // content-start: in the 2-column grid a field must not stretch to its taller neighbour.
  const field = (name: string, label: string, help: React.ReactNode, input: React.ReactNode, wide = false) => (
    <div className={`grid content-start gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={name}>{label}</Label>
      {input}
      {err(name) ? <p className="text-sm text-destructive" role="alert">{err(name)}</p> : help && <div id={`${name}-help`} className="text-sm text-muted-foreground">{help}</div>}
    </div>
  );
  // Same order as the card, top to bottom: photo, name, username, district, BGG username, about.
  return (
    <Form method="post" encType="multipart/form-data" className="grid gap-5">
      <input type="hidden" name="intent" value="profile" />
      <div className="grid gap-5 sm:grid-cols-2">
        {field("avatar", "Photo (optional)", "JPG, PNG or WebP, max 2 MB.",
          <Input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={!!err("avatar")} aria-describedby="avatar-help" />, true)}
        {field("displayName", "Name", null, <Input id="displayName" name="displayName" required maxLength={40} defaultValue={defaults.displayName} aria-invalid={!!err("displayName")} />)}
        {field("handle", "Username",
          <>
            <span>Shown as @{username || "username"} on your card and in your card link.</span>
            {!isNew && username !== defaults.handle && <span className="block font-semibold text-ink">Your old card link will stop working</span>}
          </>,
          // Lowercase and strip anything not allowed as they type, so the rule needs no sentence.
          <Input id="handle" name="handle" required minLength={3} maxLength={20} autoComplete="username" autoCapitalize="none" spellCheck={false}
            value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} aria-invalid={!!err("handle")} aria-describedby="handle-help" />)}
        {field("district", "District", "Only your district is shown",
          <select id="district" name="district" required defaultValue={defaults.district} className={fieldClass} aria-invalid={!!err("district")} aria-describedby="district-help">
            <option value="" disabled>Pick your district</option>
            {DISTRICT_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((d) => <option key={d} value={d}>{d}</option>)}
              </optgroup>
            ))}
          </select>)}
        {field("bggUsername", "BoardGameGeek username (optional)", "For Hotness and importing your collection",
          <Input id="bggUsername" name="bggUsername" maxLength={40} defaultValue={defaults.bggUsername} aria-invalid={!!err("bggUsername")} aria-describedby="bggUsername-help" />)}
        {field("bio", "About you (optional)", null,
          <Textarea id="bio" name="bio" maxLength={280} rows={3} placeholder="What do you like to play?" defaultValue={defaults.bio} aria-invalid={!!err("bio")} />, true)}
      </div>
      {result && !result.ok && result.fieldErrors && <p role="alert" className="text-destructive">{result.message}</p>}
      <div className="flex justify-end">
        <Button size="lg" type="submit" disabled={busy}>{busy ? "Saving…" : isNew ? "Create my card" : "Save"}</Button>
      </div>
    </Form>
  );
}

// ---------- Games (laid out like the card: colored labels, solid rules) ----------

function Part({ icon, label, color, aside, children }: { icon?: React.ReactNode; label: string; color?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t-2 border-ink py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`flex items-center gap-2 text-base font-extrabold uppercase ${color ?? "text-ink"}`}>{icon}{label}</h2>
        {aside && <span className="text-sm font-semibold text-muted-foreground tabular-nums">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

type ListGame = { bggId: number; name: string; thumbnail: string | null; price?: number | null; condition?: string | null };

function GameList({ kind, addLabel, games, max, price }: { kind: Kind; addLabel: string; games: ListGame[]; max: number; price?: "sell" | "buy" }) {
  const fetcher = useFetcher<ActionResult>();
  useResultToast(fetcher.data);
  const [pending, setPending] = useState<{ bggId: number; name: string } | null>(null);
  const busy = fetcher.state !== "idle";
  const add = (bggId: number, extra: Record<string, string> = {}) => fetcher.submit({ intent: "add", kind, bggId: String(bggId), ...extra }, { method: "post" });
  return (
    <div className="grid gap-3">
      {games.length > 0 && (
        <ul className="grid gap-1">
          {games.map((g) => (
            <li key={g.bggId} className="flex min-h-12 items-center gap-3">
              <GameThumb src={g.thumbnail} name={g.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{g.name}</span>
                {(g.price || g.condition) && (
                  <span className="block text-sm text-muted-foreground">{[g.price ? formatRupiah(g.price) : null, g.condition].filter(Boolean).join(" · ")}</span>
                )}
              </span>
              {kind === "sell" && (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => fetcher.submit({ intent: "sold", bggId: String(g.bggId) }, { method: "post" })}>
                  Sold<span className="sr-only"> {g.name}</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => fetcher.submit({ intent: "remove", kind, bggId: String(g.bggId) }, { method: "post" })}>
                Remove<span className="sr-only"> {g.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {games.length >= max ? null : pending ? (
        <form className="grid gap-3 rounded-lg bg-muted p-4" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          add(pending.bggId, { price: String(f.get("price") ?? ""), condition: String(f.get("condition") ?? "") });
          setPending(null);
        }}>
          <p className="font-bold">{pending.name}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor={`${kind}-price`}>{price === "sell" ? "Price" : "Budget (optional)"}</Label>
              <Input id={`${kind}-price`} name="price" inputMode="numeric" placeholder="e.g. 350k" />
            </div>
            {price === "sell" && (
              <div className="grid content-start gap-2">
                <Label htmlFor={`${kind}-condition`}>Condition (optional)</Label>
                <Input id={`${kind}-condition`} name="condition" maxLength={40} placeholder="e.g. Like new" />
              </div>
            )}
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      ) : (
        <GamePicker label={addLabel} disabled={busy} onPick={(h) => (price ? setPending(h) : add(h.bggId))} />
      )}
    </div>
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
    <div className="mx-auto grid max-w-2xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">{isNew ? "Make your card" : "Edit your card"}</h1>
        {!isNew && <Button asChild variant="outline"><Link to={`/p/${defaults.handle}`}>View card</Link></Button>}
      </div>

      <section aria-label="Profile" className="panel p-5">
        <ProfileForm defaults={defaults} isNew={isNew} result={profileResult} />
      </section>

      {card && (
        <div className="panel p-5">
          <Part icon={<Heart className="icon" style={fill} aria-hidden />} label="Favorites" color="text-fav" aside={`${card.favorite.length} of 3`}>
            <GameList kind="favorite" addLabel="Add a favorite" games={card.favorite} max={3} />
          </Part>

          <Part icon={<Flame className="icon" style={fill} aria-hidden />} label="Hotness" color="text-hot" aside="Automatic">
            {card.hot.length > 0 && <p className="font-semibold">{card.hot.map((g) => g.name).join(", ")}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{card.hotSource ? HOT_SOURCE_LABEL[card.hotSource] : "Nothing yet"}</p>
              <Button variant="outline" size="sm" disabled={hotFetcher.state !== "idle"} onClick={() => hotFetcher.submit({ intent: "refresh-hot" }, { method: "post" })}>
                {hotFetcher.state !== "idle" ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </Part>

          <Part icon={<MessageCircle className="icon" style={fill} aria-hidden />} label="Want to play" color="text-want">
            <GameList kind="want" addLabel="Add a game you want to play" games={card.want} max={30} />
          </Part>

          <Part icon={<ShoppingBag className="icon" style={fill} stroke="#fff" aria-hidden />} label="Trade" color="text-trade" aside="Deals happen on WhatsApp">
            <h3 className="font-bold">Selling</h3>
            <GameList kind="sell" addLabel="Add a game you're selling" games={card.sell} max={30} price="sell" />
            <h3 className="mt-2 font-bold">Looking to buy</h3>
            <GameList kind="buy" addLabel="Add a game you want to buy" games={card.buy} max={30} price="buy" />
          </Part>

          <Part label="Owned games" aside={String(card.own.length)}>
            <p className="text-sm text-muted-foreground">Not shown on your card. Lets people find who owns a game.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" disabled={importFetcher.state !== "idle" || !defaults.bggUsername} onClick={() => importFetcher.submit({ intent: "import-owned" }, { method: "post" })}>
                {importFetcher.state !== "idle" ? "Importing…" : "Import from BGG"}
              </Button>
              {!defaults.bggUsername && <p className="text-sm text-muted-foreground">Add your BGG username first</p>}
            </div>
            <GameList kind="own" addLabel="Or add one by hand" games={[]} max={300} />
          </Part>
        </div>
      )}
    </div>
  );
}
