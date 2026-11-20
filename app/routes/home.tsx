import { desc, eq } from "drizzle-orm";
import { Flame, Heart, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { Link, redirect } from "react-router";
import { PersonAvatar } from "@/components/game-thumb";
import { Button } from "@/components/ui/button";
import { profile, user } from "@/db/schema";
import { getDb } from "@/lib/.server/db";
import { SITE_DEFAULTS } from "@/lib/site-text";
import { getViewer } from "@/lib/.server/viewer";
import { useShell } from "./shell";
import type { Route } from "./+types/home";

export const meta = () => {
  const description = "Find board gamers in Bekasi who love the same games, own the game you want to play, or sell the game you're after.";
  return [
    { title: "Bekasi Board Game Hub" },
    { name: "description", content: description },
    { property: "og:title", content: "Bekasi Board Game Hub" },
    { property: "og:description", content: description },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const v = await getViewer(request);
  if (v) throw redirect(v.profile ? "/feed" : "/me/edit");
  const members = await getDb()
    .select({ handle: profile.handle, displayName: profile.displayName, district: profile.district, avatarKey: profile.avatarKey, image: user.image })
    .from(profile).innerJoin(user, eq(user.id, profile.userId))
    .orderBy(desc(profile.createdAt)).limit(8);
  return { members: members.map((m) => ({ ...m, avatar: m.avatarKey ? `/img/${m.avatarKey}` : m.image })) };
}

const fill = { fill: "currentColor" } as const;

// What each numbered part of the card finds for you. The numbers match the markers on the example card (sketch motif).
const PARTS = [
  { n: 1, title: "Favorites and hotness", text: "Matched with members who love the same games or have been playing them lately" },
  { n: 2, title: "Want to play", text: "Shows who owns that game, and who else is looking for a table for it" },
  { n: 3, title: "Trade", text: "Games you sell meet members looking for them. You settle the deal on WhatsApp." },
  { n: 4, title: "District", text: "Narrow any search to players near you, from Tambun to Pondok Gede" },
];

/** Example card in the sketch's layout. Decorative (aria-hidden); everything it shows is explained in the list beside it. */
function ExampleCard() {
  // Each part carries its own marker on the card's left edge, outside the text (as in the sketch).
  const part = (n: number | null, icon: React.ReactNode, text: string, color: string, games: string, ruled: boolean) => (
    <div className={`relative grid gap-1 ${ruled ? "border-t-2 border-ink pt-3" : ""}`}>
      {n && <span className={`marker absolute -left-[3.1rem] ${ruled ? "top-3" : "-top-0.5"}`}>{n}</span>}
      <p className={`flex items-center gap-2 text-sm font-extrabold uppercase ${color}`}>{icon}{text}</p>
      <p className="font-semibold">{games}</p>
    </div>
  );
  return (
    <figure className="grid w-full max-w-[19rem] gap-3 pl-5">
      <div aria-hidden className="player-card relative rotate-2 overflow-visible">
        <div className="relative rounded-t-[17px] border-b-[3px] border-ink bg-brand pb-4 pl-8 pr-5 pt-5">
          <span className="marker absolute -left-5 top-12">4</span>
          <p className="text-3xl font-extrabold uppercase leading-none">Malik</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold"><MapPin className="icon" />Bekasi Timur</p>
        </div>
        <div className="grid gap-3 pb-5 pl-8 pr-5 pt-4">
          {part(1, <Heart className="icon" style={fill} />, "Favorites", "text-fav", "Arnak, Wingspan, Everdell", false)}
          {part(null, <Flame className="icon" style={fill} />, "Hotness", "text-hot", "The Crew, Harmonies", true)}
          {part(2, <MessageCircle className="icon" style={fill} />, "Want to play", "text-want", "Oath", true)}
          {part(3, <ShoppingBag className="icon" style={fill} stroke="#fff" />, "Trade", "text-trade", "Selling Catan", true)}
        </div>
      </div>
      <figcaption className="text-center text-sm text-muted-foreground">Example card</figcaption>
    </figure>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const site = useShell()?.site ?? SITE_DEFAULTS; // headline and intro are edited in Admin > Site
  return (
    <div className="grid gap-16">
      <section className="grid items-center gap-x-12 gap-y-10 pt-2 md:grid-cols-[1fr_auto]">
        <div className="grid max-w-xl gap-5">
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">{site.homeTitle}</h1>
          <p className="text-lg leading-relaxed">{site.homeIntro}</p>
          <div>
            <Button asChild size="lg"><Link to="/sign-in">Make my player card</Link></Button>
          </div>
        </div>
        <div className="flex justify-center pl-4 md:justify-end">
          <ExampleCard />
        </div>
      </section>

      <section aria-labelledby="parts" className="grid gap-6">
        <h2 id="parts" className="text-2xl font-extrabold">What each part of your card finds</h2>
        <ol className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {PARTS.map((p) => (
            <li key={p.n} className="flex gap-4">
              <span className="marker" aria-hidden>{p.n}</span>
              <div className="grid gap-1">
                <h3 className="text-lg font-extrabold">{p.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {loaderData.members.length > 0 && (
        <section aria-labelledby="newest" className="grid gap-4">
          <h2 id="newest" className="text-2xl font-extrabold">Newest members</h2>
          <ul className="panel grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            {loaderData.members.map((m) => (
              <li key={m.handle} className="sm:border-b sm:border-line">
                <Link to={`/p/${m.handle}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                  <PersonAvatar src={m.avatar} name={m.displayName} size={44} />
                  <span className="min-w-0">
                    <span className="block font-bold">{m.displayName}</span>
                    <span className="block text-sm text-muted-foreground">{m.district}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
