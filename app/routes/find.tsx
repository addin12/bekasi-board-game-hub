import { eq } from "drizzle-orm";
import { Flame, MessageCircle, ShoppingBag } from "lucide-react";
import { Form, Link, useNavigate, useSearchParams } from "react-router";
import { GamePicker } from "@/components/game-picker";
import { GameThumb, PersonAvatar } from "@/components/game-thumb";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { game } from "@/db/schema";
import { DISTRICT_GROUPS, DISTRICTS } from "@/lib/districts";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/validate";
import { REASON_LABEL, type FindMode } from "@/lib/find";
import { findPeople } from "@/lib/.server/cards";
import { getDb } from "@/lib/.server/db";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/find";

export const meta = () => [{ title: "Find players · Bekasi Board Game Hub" }];

const MODES: { key: FindMode; label: string; help: string; icon: React.ReactNode }[] = [
  { key: "like", label: "Like-minded players", help: "People who love the same games as you.", icon: <Flame className="size-5 text-hot" aria-hidden /> },
  { key: "play", label: "People to play with", help: "Owners of games you want to play, and people who want the same games.", icon: <MessageCircle className="size-5 text-want" aria-hidden /> },
  { key: "trade", label: "Buy & sell", help: "Sellers of games you're looking for, and buyers for games you sell.", icon: <ShoppingBag className="size-5 text-trade" aria-hidden /> },
];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireMember(request);
  const sp = new URL(request.url).searchParams;
  const mode = (["like", "play", "trade"].includes(sp.get("mode") ?? "") ? sp.get("mode") : "like") as FindMode;
  const gameId = Number(sp.get("game")) || null;
  const district = DISTRICTS.includes(sp.get("district") ?? "") ? sp.get("district") : null;
  const verifiedOnly = sp.get("verified") === "1";
  const db = getDb();
  const [results, gameRow] = await Promise.all([
    findPeople(db, { me: v.user.id, mode, bggId: gameId, district, verifiedOnly }),
    gameId ? db.select({ name: game.name }).from(game).where(eq(game.bggId, gameId)).limit(1) : Promise.resolve([]),
  ]);
  return { mode, gameId, gameName: gameRow[0]?.name ?? null, district, verifiedOnly, results };
}

export default function Find({ loaderData }: Route.ComponentProps) {
  const { mode, gameId, gameName, district, verifiedOnly, results } = loaderData;
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const withParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k);
    return `/find?${next}`;
  };
  const current = MODES.find((m) => m.key === mode)!;
  const hasFilters = Boolean(gameId || district || verifiedOnly);

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-3xl font-extrabold">Find</h1>
        <p className="text-muted-foreground">Matches come from player cards. The more you add to yours, the better they get.</p>
      </div>

      <nav aria-label="What to find" className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <Link key={m.key} to={withParams({ mode: m.key })} aria-current={m.key === mode ? "page" : undefined}
            className={cn("sticker-sm liftable flex min-h-14 items-center gap-3 p-3", m.key === mode && "bg-primary")}>
            {m.icon}<span className="font-medium">{m.label}</span>
          </Link>
        ))}
      </nav>

      <section aria-label="Filters" className="grid gap-4 sticker p-5">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-start">
          <GamePicker label="One game (optional)" help={gameName ? `Showing: ${gameName}` : "Leave empty to match on your whole card."} onPick={(h) => navigate(withParams({ game: String(h.bggId) }))} />
          <Form method="get" className="contents">
            <input type="hidden" name="mode" value={mode} />
            {gameId && <input type="hidden" name="game" value={gameId} />}
            <div className="grid gap-2">
              <Label htmlFor="district">District</Label>
              <select id="district" name="district" defaultValue={district ?? ""} onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="h-11 w-full rounded-xl border-2 border-input bg-white px-3 text-base">
                <option value="">All of Bekasi</option>
                {DISTRICT_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>{g.items.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>
                ))}
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-2 md:mt-7">
              <input type="checkbox" name="verified" value="1" defaultChecked={verifiedOnly} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="size-5" />
              Verified members only
            </label>
          </Form>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {gameName && <Link className="rounded-full border-2 border-ink bg-accent px-3 py-2 text-sm font-semibold" to={withParams({ game: null })}>Game: {gameName} ✕</Link>}
            {district && <Link className="rounded-full border-2 border-ink bg-accent px-3 py-2 text-sm font-semibold" to={withParams({ district: null })}>District: {district} ✕</Link>}
            {verifiedOnly && <Link className="rounded-full border-2 border-ink bg-accent px-3 py-2 text-sm font-semibold" to={withParams({ verified: null })}>Verified only ✕</Link>}
            <Button asChild variant="ghost" size="sm"><Link to={`/find?mode=${mode}`}>Clear filters</Link></Button>
          </div>
        )}
      </section>

      <section className="grid gap-4" aria-live="polite">
        <h2 className="text-xl font-semibold">{results.length} {results.length === 1 ? "match" : "matches"} · {current.label}</h2>
        {results.length === 0 ? (
          <div className="grid gap-2 rounded-2xl border-2 border-dashed border-ink/40 bg-card p-6">
            <p className="font-medium">No matches yet.</p>
            <p className="text-muted-foreground">{current.help} Add more games to your card, or try another game or district.</p>
            <Button asChild variant="outline" className="w-fit"><Link to="/me/edit">Add games to my card</Link></Button>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {results.map((p) => (
              <li key={p.userId} className="grid gap-3 sticker p-4">
                <Link to={`/p/${p.handle}`} className="flex items-center gap-3">
                  <PersonAvatar src={p.avatar} name={p.displayName} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{p.displayName}{p.verified && <span className="ml-2 text-sm font-normal text-muted-foreground">Verified</span>}</span>
                    <span className="block text-sm text-muted-foreground">@{p.handle} · {p.district}</span>
                  </span>
                </Link>
                <ul className="grid gap-2">
                  {p.matches.map((m) => (
                    <li key={`${m.bggId}-${m.reason}`}>
                      <Link to={`/g/${m.bggId}`} className="flex items-center gap-3">
                        <GameThumb src={m.thumbnail} name={m.name} className="size-10" />
                        <span className="min-w-0">
                          <span className="block font-medium">{m.name}</span>
                          <span className="block text-sm text-muted-foreground">{REASON_LABEL[m.reason]}{m.price ? ` · ${formatRupiah(m.price)}` : ""}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
