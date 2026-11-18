import { ArrowDown, ArrowUp, BadgeCheck, Flame, Heart, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { Link } from "react-router";
import { GameThumb, PersonAvatar } from "@/components/game-thumb";
import { HOT_SOURCE_LABEL } from "@/lib/hotness";
import { formatRupiah } from "@/lib/validate";
import type { Card } from "@/lib/.server/cards";

function Section({ icon, label, color, children, empty }: { icon: React.ReactNode; label: string; color: string; children: React.ReactNode; empty: boolean }) {
  return (
    <section className="grid gap-3 border-t-2 border-dashed border-ink/20 pt-5">
      <h2 className={`flex items-center gap-2 font-display text-base font-extrabold uppercase tracking-wide ${color}`}>
        {icon}
        {label}
      </h2>
      {empty ? <p className="text-muted-foreground">Nothing here yet.</p> : children}
    </section>
  );
}

function GameLine({ g, extra }: { g: { bggId: number; name: string; thumbnail: string | null }; extra?: React.ReactNode }) {
  return (
    <li>
      <Link to={`/g/${g.bggId}`} className="flex min-h-11 items-center gap-3 rounded-lg py-1 hover:bg-accent">
        <GameThumb src={g.thumbnail} name={g.name} className="size-10" />
        <span className="min-w-0 flex-1 font-medium">{g.name}</span>
        {extra}
      </Link>
    </li>
  );
}

export function PlayerCard({ card }: { card: Card }) {
  const { person } = card;
  return (
    <article className="sticker overflow-hidden">
      <div className="card-band h-28 border-b-2 border-ink sm:h-32" />
      <div className="grid gap-5 px-5 pb-6">
        <div className="relative z-10 -mt-12 flex items-end gap-4">
          <PersonAvatar src={person.avatar} name={person.displayName} className="size-24 border-[3px] border-ink bg-primary font-display text-4xl font-extrabold shadow-[3px_3px_0_var(--color-ink)]" />
        </div>
        <div className="grid gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-extrabold uppercase">
            {person.displayName}
            {person.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-primary px-2.5 py-0.5 font-sans text-sm font-bold normal-case">
                <BadgeCheck className="size-4" aria-hidden /> Verified member
              </span>
            )}
          </h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            {card.bggUsername ? (
              <a className="underline underline-offset-4" href={`https://boardgamegeek.com/user/${encodeURIComponent(card.bggUsername)}`} target="_blank" rel="noreferrer">
                @{person.handle} on BGG
              </a>
            ) : (
              <span>@{person.handle}</span>
            )}
            {person.district && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {person.district}
              </span>
            )}
          </p>
        </div>
        {card.bio && <p className="max-w-prose leading-relaxed">{card.bio}</p>}

        <Section icon={<Heart className="size-4" aria-hidden />} label="Favorites" color="text-fav" empty={!card.favorite.length}>
          <ul className="flex flex-wrap gap-3">
            {card.favorite.map((g) => (
              <li key={g.bggId}>
                <Link to={`/g/${g.bggId}`} className="grid w-24 gap-2 text-sm">
                  <GameThumb src={g.thumbnail} name={g.name} className="size-24 rounded-xl" />
                  <span className="font-medium leading-snug">{g.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Flame className="size-4" aria-hidden />} label="Hotness" color="text-hot" empty={!card.hot.length}>
          <ul className="grid gap-1">
            {card.hot.map((g) => <GameLine key={g.bggId} g={g} />)}
          </ul>
          {card.hotSource && <p className="text-sm text-muted-foreground">{HOT_SOURCE_LABEL[card.hotSource]}</p>}
        </Section>

        <Section icon={<MessageCircle className="size-4" aria-hidden />} label="Want to play" color="text-want" empty={!card.want.length}>
          <ul className="grid gap-1">
            {card.want.map((g) => <GameLine key={g.bggId} g={g} />)}
          </ul>
        </Section>

        <Section icon={<ShoppingBag className="size-4" aria-hidden />} label="Trade" color="text-trade" empty={!card.sell.length && !card.buy.length}>
          <ul className="grid gap-1">
            {card.sell.map((g) => (
              <GameLine key={`s${g.bggId}`} g={g} extra={
                <span className="inline-flex items-center gap-1 text-sm">
                  <ArrowUp className="size-4 text-trade" aria-hidden /> Selling{g.price ? ` · ${formatRupiah(g.price)}` : ""}
                </span>
              } />
            ))}
            {card.buy.map((g) => (
              <GameLine key={`b${g.bggId}`} g={g} extra={
                <span className="inline-flex items-center gap-1 text-sm">
                  <ArrowDown className="size-4 text-fav" aria-hidden /> Looking to buy
                </span>
              } />
            ))}
          </ul>
        </Section>
      </div>
    </article>
  );
}
