import { eq } from "drizzle-orm";
import { Link } from "react-router";
import { GameThumb, PersonAvatar } from "@/components/game-thumb";
import { ShareButtons } from "@/components/share-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { game } from "@/db/schema";
import { formatRupiah } from "@/lib/validate";
import { ensureGames } from "@/lib/.server/bgg";
import { gamePeople } from "@/lib/.server/cards";
import { getDb } from "@/lib/.server/db";
import { addGame, removeGame } from "@/lib/.server/card-actions";
import { getViewer, requireMember } from "@/lib/.server/viewer";
import { GameActions } from "@/components/game-actions";
import type { Route } from "./+types/g.$bggId";

export async function loader({ params, request }: Route.LoaderArgs) {
  const bggId = Number(params.bggId);
  if (!Number.isInteger(bggId) || bggId <= 0) throw new Response("Not found", { status: 404 });
  const db = getDb();
  const v = await getViewer(request);
  // Only members may make us call BGG; visitors see games already cached (so random ids can't burn our quota).
  if (v) {
    try { await ensureGames(db, [bggId]); } catch { /* BGG down: show what we have */ }
  }
  const [g] = await db.select().from(game).where(eq(game.bggId, bggId)).limit(1);
  if (!g) throw new Response("Not found", { status: 404 });
  const people = await gamePeople(db, bggId);
  // Which lists this game is on for the viewer: lets the page show pressed buttons.
  const mine = v?.profile ? people.filter((p) => p.userId === v.user.id && p.kind !== "hot").map((p) => p.kind) : [];
  return { game: g, people, mine, signedIn: Boolean(v), hasCard: Boolean(v?.profile), url: new URL(request.url).toString() };
}

export async function action({ request, params }: Route.ActionArgs) {
  const v = await requireMember(request);
  const form = await request.formData();
  const db = getDb();
  form.set("bggId", params.bggId); // the page's own game, whatever the form says
  if (form.get("intent") === "add") return addGame(db, v.user.id, form);
  if (form.get("intent") === "remove") return removeGame(db, v.user.id, form);
  return { ok: false as const, message: "Unknown action" };
}

export const meta = ({ loaderData: data }: Route.MetaArgs) => {
  if (!data) return [{ title: "Game not found · Bekasi Board Game Hub" }];
  const n = new Set(data.people.map((p) => p.userId)).size;
  const title = `${data.game.name} · Bekasi Board Game Hub`;
  const description = `${n} member${n === 1 ? "" : "s"} in Bekasi own, love, want to play or trade ${data.game.name}.`;
  return [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:url", content: data.url },
    ...(data.game.image ? [{ property: "og:image", content: data.game.image }] : []),
  ];
};

const TABS = [
  { key: "loves", label: "Loves it", kinds: ["favorite", "hot"] },
  { key: "own", label: "Owns it", kinds: ["own"] },
  { key: "want", label: "Wants to play", kinds: ["want"] },
  { key: "sell", label: "Selling", kinds: ["sell"] },
  { key: "buy", label: "Looking to buy", kinds: ["buy"] },
] as const;

export default function GamePage({ loaderData }: Route.ComponentProps) {
  const { game: g, people, mine, signedIn, hasCard } = loaderData;
  const facts = [
    g.year && `${g.year}`,
    g.minPlayers && `${g.minPlayers}${g.maxPlayers && g.maxPlayers !== g.minPlayers ? `–${g.maxPlayers}` : ""} players`,
    g.playingTime && `${g.playingTime} min`,
    g.weight && `Weight ${g.weight.toFixed(1)} / 5`,
  ].filter(Boolean);
  const groups = TABS.map((t) => {
    const seen = new Set<string>();
    const list = people.filter((p) => (t.kinds as readonly string[]).includes(p.kind) && !seen.has(p.userId) && seen.add(p.userId));
    return { ...t, list };
  });
  const first = groups.find((x) => x.list.length)?.key ?? "loves";

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-start gap-5">
        {/* Box cover stays square here: on its own page the game is a box, not a token. */}
        <GameThumb src={g.image ?? g.thumbnail} name={g.name} size={144} square />
        <div className="grid min-w-0 flex-1 gap-3">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{g.name}</h1>
          {facts.length > 0 && <p className="font-semibold text-muted-foreground tabular-nums">{facts.join(" · ")}</p>}
          <a className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4" href={`https://boardgamegeek.com/boardgame/${g.bggId}`} target="_blank" rel="noreferrer">See it on BoardGameGeek</a>
          <ShareButtons title={`Who plays ${g.name} in Bekasi`} path={`/g/${g.bggId}`} />
        </div>
      </div>

      <GameActions bggId={g.bggId} signedIn={signedIn} hasCard={hasCard} mine={mine} />

      <Tabs defaultValue={first}>
        <TabsList>
          {groups.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label} <span className="tabular-nums text-muted-foreground">{t.list.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            {t.list.length === 0 ? (
              <p className="text-muted-foreground">No members here yet</p>
            ) : (
              <ul className="panel grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
                {t.list.map((p) => (
                  <li key={p.userId} className="sm:border-b sm:border-line">
                    <Link to={`/p/${p.handle}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                      <PersonAvatar src={p.avatar} name={p.displayName} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{p.displayName}{p.verified && <span className="ml-2 text-sm font-semibold text-muted-foreground">Verified</span>}</span>
                        <span className="block text-sm text-muted-foreground">
                          {p.district}
                          {t.key === "sell" && p.price ? ` · ${formatRupiah(p.price)}` : ""}
                          {t.key === "sell" && p.condition ? ` · ${p.condition}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
