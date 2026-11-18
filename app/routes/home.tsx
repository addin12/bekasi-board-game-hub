import { desc, eq } from "drizzle-orm";
import { Flame, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { Link, redirect } from "react-router";
import { CharcoalSatin } from "@/components/charcoal-satin";
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

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="grid gap-12">
      <CharcoalSatin className="-mx-4 rounded-none sm:mx-0 sm:rounded-3xl">
        {/* Dark scrim keeps the headline readable over the bright satin highlights. */}
        <div className="grid gap-5 bg-gradient-to-r from-black/80 via-black/60 to-black/20 px-6 py-14 sm:px-10 sm:py-20">
          <p className="text-sm font-medium uppercase tracking-wider text-white/80">For the Bekasi board game community</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white text-balance sm:text-5xl">Find your next table in Bekasi</h1>
          <p className="max-w-xl text-lg text-white/85">Every member has a player card. Cards are matched so you can find people to play with, games to borrow, and games to buy.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-black hover:bg-white/90"><Link to="/sign-in">Make my player card</Link></Button>
          </div>
        </div>
      </CharcoalSatin>

      <section className="grid gap-4 md:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p.title} className="grid content-start gap-3 rounded-2xl border border-border bg-card p-5">
            {p.icon}
            <h2 className="text-xl font-semibold">{p.title}</h2>
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
                <Link to={`/p/${m.handle}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-secondary/60">
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
