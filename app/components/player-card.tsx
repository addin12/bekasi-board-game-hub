import { ArrowDown, ArrowUp, BadgeCheck, Flame, Heart, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import { Link } from "react-router";
import { GameThumb, PersonAvatar } from "@/components/game-thumb";
import { HOT_SOURCE_LABEL } from "@/lib/hotness";
import { formatRupiah } from "@/lib/validate";
import type { Card } from "@/lib/.server/cards";

// Layout follows the owner's sketch (brainstorm/player-card.png): orange header with name, solid rules,
// uppercase colored labels with filled icons, round game tokens, trade arrows on the token corner.

function Section({ icon, label, color, children, empty }: { icon: React.ReactNode; label: string; color: string; children: React.ReactNode; empty: boolean }) {
  return (
    <section className="grid gap-3 border-t-2 border-ink pt-4">
      <h2 className={`flex items-center gap-2 text-base font-extrabold uppercase ${color}`}>
        {icon}
        {label}
      </h2>
      {empty ? <p className="text-muted-foreground">Nothing here yet.</p> : children}
    </section>
  );
}

function GameRow({ g, badge, extra }: { g: { bggId: number; name: string; thumbnail: string | null }; badge?: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <li>
      <Link to={`/g/${g.bggId}`} className="group flex min-h-12 items-center gap-3 rounded-lg py-1">
        <span className="relative">
          <GameThumb src={g.thumbnail} name={g.name} size={44} />
          {badge}
        </span>
        <span className="min-w-0 flex-1 font-semibold group-hover:underline group-hover:underline-offset-4">{g.name}</span>
        {extra}
      </Link>
    </li>
  );
}

const fill = { fill: "currentColor" } as const;

export function PlayerCard({ card }: { card: Card }) {
  const { person } = card;
  return (
    <article className="player-card overflow-hidden">
      <header className="flex items-end gap-4 border-b-[3px] border-ink bg-brand px-5 pb-5 pt-6">
        <div className="grid min-w-0 flex-1 gap-1">
          <h1 className="text-3xl font-extrabold uppercase leading-none text-ink sm:text-4xl">{person.displayName}</h1>
          <p className="text-sm font-semibold text-ink">
            {card.bggUsername ? (
              <a className="underline underline-offset-2" href={`https://boardgamegeek.com/user/${encodeURIComponent(card.bggUsername)}`} target="_blank" rel="noreferrer">
                @{person.handle} on BGG
              </a>
            ) : (
              <>@{person.handle}</>
            )}
          </p>
          {person.district && (
            <p className="flex items-center gap-1 text-sm font-semibold text-ink">
              <MapPin className="size-4" style={fill} stroke="var(--color-brand)" aria-hidden /> {person.district}
            </p>
          )}
          {person.verified && (
            <p className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">
              <BadgeCheck className="size-4" aria-hidden /> Verified member
            </p>
          )}
        </div>
        <PersonAvatar src={person.avatar} name={person.displayName} size={96} className="border-[3px] bg-card" />
      </header>

      <div className="grid gap-5 px-5 pb-6 pt-5">
        {card.bio && <p className="max-w-prose leading-relaxed">{card.bio}</p>}

        <Section icon={<Heart className="size-5" style={fill} aria-hidden />} label="Favorites" color="text-fav" empty={!card.favorite.length}>
          <div className="grid gap-2">
            {/* Overlapping tokens as in the sketch; the names below are the real links. */}
            <div aria-hidden className="flex">
              {card.favorite.map((g, i) => (
                <GameThumb key={g.bggId} src={g.thumbnail} name={g.name} size={60} className={i ? "-ml-3" : ""} />
              ))}
            </div>
            <p className="font-semibold leading-relaxed">
              {card.favorite.map((g, i) => (
                <span key={g.bggId}>
                  {i > 0 && ", "}
                  <Link className="underline-offset-4 hover:underline" to={`/g/${g.bggId}`}>{g.name}</Link>
                </span>
              ))}
            </p>
          </div>
        </Section>

        <Section icon={<Flame className="size-5" style={fill} aria-hidden />} label="Hotness" color="text-hot" empty={!card.hot.length}>
          <ul className="grid gap-1">
            {card.hot.map((g) => <GameRow key={g.bggId} g={g} />)}
          </ul>
          {card.hotSource && <p className="text-sm text-muted-foreground">{HOT_SOURCE_LABEL[card.hotSource]}</p>}
        </Section>

        <Section icon={<MessageCircle className="size-5" style={fill} aria-hidden />} label="Want to play" color="text-want" empty={!card.want.length}>
          <ul className="grid gap-1">
            {card.want.map((g) => <GameRow key={g.bggId} g={g} />)}
          </ul>
        </Section>

        <Section icon={<ShoppingBag className="size-5" style={fill} stroke="#fff" aria-hidden />} label="Trade" color="text-trade" empty={!card.sell.length && !card.buy.length}>
          <ul className="grid gap-1">
            {card.sell.map((g) => (
              <GameRow key={`s${g.bggId}`} g={g}
                badge={<span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-trade text-white"><ArrowUp className="size-3" strokeWidth={3} aria-hidden /></span>}
                extra={<span className="text-right text-sm font-semibold">Selling{g.price ? <><br />{formatRupiah(g.price)}</> : null}</span>} />
            ))}
            {card.buy.map((g) => (
              <GameRow key={`b${g.bggId}`} g={g}
                badge={<span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-white bg-fav text-white"><ArrowDown className="size-3" strokeWidth={3} aria-hidden /></span>}
                extra={<span className="text-right text-sm font-semibold">Looking to buy</span>} />
            ))}
          </ul>
        </Section>
      </div>
    </article>
  );
}
