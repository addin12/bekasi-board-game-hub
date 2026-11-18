import { desc, eq } from "drizzle-orm";
import { Flame, Heart, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { Link, redirect } from "react-router";
import { PersonAvatar } from "@/components/game-thumb";
import { Button } from "@/components/ui/button";
import { profile, user } from "@/db/schema";
import { getDb } from "@/lib/.server/db";
import { getViewer } from "@/lib/.server/viewer";
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
  if (v) throw redirect(v.profile ? "/find" : "/me/edit");
  const members = await getDb()
    .select({ handle: profile.handle, displayName: profile.displayName, district: profile.district, avatarKey: profile.avatarKey, image: user.image })
    .from(profile).innerJoin(user, eq(user.id, profile.userId))
    .orderBy(desc(profile.createdAt)).limit(8);
  return { members: members.map((m) => ({ ...m, avatar: m.avatarKey ? `/img/${m.avatarKey}` : m.image })) };
}

const POINTS = [
  { icon: <Flame className="size-6 text-hot" aria-hidden />, title: "Meet like-minded players", text: "Your card shows your favorites and what you've loved playing lately. We match you with people who love the same games." },
  { icon: <MessageCircle className="size-6 text-want" aria-hidden />, title: "Get a table for any game", text: "Want to play something? See who owns it and who else wants to play it, close to you." },
  { icon: <ShoppingBag className="size-6 text-trade" aria-hidden />, title: "Buy and sell within the group", text: "List games you sell or look for. Matches find each other; you settle the deal on WhatsApp." },
];

/** A small example card for the hero, tossed on the table. Clearly marked as an example. */
function ExampleCard() {
  const row = (icon: React.ReactNode, label: string, color: string, games: string[]) => (
    <div className="grid gap-1 border-t-2 border-dashed border-ink/20 pt-3">
      <p className={`flex items-center gap-1.5 font-display text-sm font-extrabold uppercase ${color}`}>{icon}{label}</p>
      <p className="font-semibold">{games.join(" · ")}</p>
    </div>
  );
  return (
    <div aria-hidden className="sticker relative w-full max-w-xs rotate-3 overflow-hidden">
      <span className="absolute right-3 top-3 rounded-full border-2 border-ink bg-white px-2 py-0.5 text-xs font-bold">Example</span>
      <div className="card-band h-16 border-b-2 border-ink" />
      <div className="grid gap-3 px-4 pb-4">
        <span className="-mt-8 grid size-16 place-items-center rounded-full border-[3px] border-ink bg-primary font-display text-2xl font-extrabold shadow-[3px_3px_0_var(--color-ink)]">M</span>
        <div>
          <p className="font-display text-2xl font-extrabold uppercase leading-none">Malik</p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" />Bekasi Timur</p>
        </div>
        {row(<Heart className="size-4" />, "Favorites", "text-fav", ["Arnak", "Wingspan", "Everdell"])}
        {row(<Flame className="size-4" />, "Hotness", "text-hot", ["The Crew", "Harmonies"])}
        {row(<MessageCircle className="size-4" />, "Want to play", "text-want", ["Oath"])}
      </div>
    </div>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="grid gap-12">
      <section className="grid items-center gap-10 py-4 md:grid-cols-[1.4fr_1fr] md:py-10">
        <div className="grid gap-5">
          <p className="w-fit -rotate-2 rounded-full border-2 border-ink bg-secondary px-3 py-1 text-sm font-bold">For the Bekasi board game community</p>
          <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.05] sm:text-6xl">
            Find your next <span className="relative inline-block"><span className="relative z-10">table</span><span aria-hidden className="absolute inset-x-[-4px] bottom-1 -z-0 h-4 -rotate-1 rounded bg-primary" /></span> in Bekasi
          </h1>
          <p className="max-w-xl text-lg leading-relaxed">Every member has a player card. Cards get matched, so you find people to play with, games to borrow, and games to buy.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/sign-in">Make my player card</Link></Button>
          </div>
        </div>
        <div className="flex justify-center py-4 md:justify-end"><ExampleCard /></div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {POINTS.map((p, i) => (
          <div key={p.title} className={`grid content-start gap-3 sticker p-5 ${["md:-rotate-1", "md:rotate-1", "md:-rotate-[0.5deg]"][i]}`}>
            <span className="grid size-12 place-items-center rounded-xl border-2 border-ink bg-accent">{p.icon}</span>
            <h2 className="text-xl font-extrabold">{p.title}</h2>
            <p className="leading-relaxed text-muted-foreground">{p.text}</p>
          </div>
        ))}
      </section>

      {loaderData.members.length > 0 && (
        <section className="grid gap-4">
          <h2 className="text-2xl font-semibold">Newest members</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {loaderData.members.map((m) => (
              <li key={m.handle}>
                <Link to={`/p/${m.handle}`} className="flex items-center gap-3 sticker-sm liftable p-3">
                  <PersonAvatar src={m.avatar} name={m.displayName} />
                  <span className="min-w-0">
                    <span className="block font-medium">{m.displayName}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" aria-hidden />{m.district}</span>
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
