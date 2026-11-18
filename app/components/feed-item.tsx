import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link, useFetcher } from "react-router";
import { GameThumb, PersonAvatar } from "@/components/game-thumb";
import { ReportButton } from "@/components/report-button";
import { Button } from "@/components/ui/button";
import { formatDay, formatStamp, formatWhen } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { FeedItem as Item } from "@/lib/.server/feed";

const link = "font-bold underline-offset-4 hover:underline";
const action = "inline-flex min-h-11 w-fit items-center text-sm font-bold underline underline-offset-4"; // a standalone link: full-size target

function Body({ item }: { item: Item }) {
  if (item.kind === "status") return item.body ? <p className="whitespace-pre-line leading-relaxed">{item.body}</p> : null;
  if (item.kind === "trade") {
    return (
      <p>
        {item.body}{" "}
        {item.refId && <Link className={link} to={`/g/${item.refId}`}>See the game</Link>}
      </p>
    );
  }
  if (item.kind === "play") {
    const p = item.play;
    if (!p) return <p className="text-muted-foreground">This play was removed.</p>;
    return (
      <div className="flex gap-3">
        <GameThumb src={p.thumbnail} name={p.gameName} size={56} />
        <div className="grid min-w-0 gap-1">
          <p>
            played <Link className={link} to={`/g/${p.bggId}`}>{p.gameName}</Link>
            {p.others.length > 0 && <> with {p.others.join(", ")}</>}
          </p>
          <p className="text-sm text-muted-foreground">{formatDay(p.playedOn)}{p.placeName ? ` · ${p.placeName}` : ""}</p>
          {p.winners.length > 0 && <p className="text-sm font-semibold">Winner: {p.winners.join(", ")}</p>}
          {item.refId && <Link className={action} to={`/plays/${item.refId}`}>See the play</Link>}
        </div>
      </div>
    );
  }
  const t = item.table;
  if (!t) return <p className="text-muted-foreground">This table was removed.</p>;
  return (
    <div className="flex gap-3">
      <GameThumb src={t.thumbnail} name={t.gameName} size={56} />
      <div className="grid min-w-0 gap-1">
        <p>opened a table for <Link className={link} to={`/g/${t.bggId}`}>{t.gameName}</Link></p>
        <p className="text-sm text-muted-foreground">{formatWhen(t.startsAt)}{t.placeName ? ` · ${t.placeName}` : ""}</p>
        <p className="text-sm font-semibold tabular-nums">
          {t.status === "cancelled" ? "Cancelled" : t.status === "done" ? "Played" : `${t.joined} of ${t.seats} seats taken`}
        </p>
        {item.refId && <Link className={action} to={`/tables/${item.refId}`}>{t.status === "open" ? "View and join" : "View table"}</Link>}
      </div>
    </div>
  );
}

export function FeedItemView({ item, viewerId, isAdmin, detail }: { item: Item; viewerId: string; isAdmin: boolean; detail?: boolean }) {
  const likeFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const [confirming, setConfirming] = useState(false);
  // Optimistic like: show the result of the click before the server answers.
  const clicked = likeFetcher.formData?.get("intent") === "like";
  const liked = clicked ? !item.liked : item.liked;
  const likes = item.likes + (clicked ? (item.liked ? -1 : 1) : 0);
  const mine = item.author.userId === viewerId;

  return (
    <article className="panel grid gap-3 p-4">
      <header>
        {/* One link around photo and name: a bigger target than the name alone. */}
        <Link to={`/p/${item.author.handle}`} className="group flex min-h-12 items-center gap-3">
          <PersonAvatar src={item.author.avatar} name={item.author.displayName} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold group-hover:underline group-hover:underline-offset-4">{item.author.displayName}</span>
            <span className="block text-sm text-muted-foreground">@{item.author.handle} · {formatStamp(item.createdAt)}</span>
          </span>
        </Link>
      </header>
      <Body item={item} />
      {item.imageKey && (
        <img src={`/img/${item.imageKey}`} alt="" width={800} height={600} loading="lazy" decoding="async" className="max-h-96 w-full rounded-lg border border-line object-cover" />
      )}
      <footer className="flex flex-wrap items-center gap-x-4 border-t border-line pt-1">
        <button type="button" aria-pressed={liked} onClick={() => likeFetcher.submit({ intent: "like" }, { method: "post", action: `/posts/${item.id}` })}
          className={cn("inline-flex h-11 items-center gap-1.5 text-sm font-semibold", liked ? "text-fav" : "text-muted-foreground hover:text-ink")}>
          <Heart className="size-5" style={liked ? { fill: "currentColor" } : undefined} aria-hidden />
          <span className="tabular-nums">{likes}</span><span className="sr-only"> likes. {liked ? "Remove your like" : "Like"}</span>
        </button>
        {detail ? (
          <span className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground"><MessageCircle className="size-5" aria-hidden /><span className="tabular-nums">{item.comments}</span><span className="sr-only"> comments</span></span>
        ) : (
          <Link to={`/posts/${item.id}`} className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-ink">
            <MessageCircle className="size-5" aria-hidden /><span className="tabular-nums">{item.comments}</span><span className="sr-only"> comments, open the post</span>
          </Link>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-x-4">
          {!mine && <ReportButton type="post" id={item.id} what="this post" />}
          {(mine || isAdmin) && (confirming ? (
            <span className="flex items-center gap-1">
              <Button size="sm" variant="destructive" disabled={deleteFetcher.state !== "idle"} onClick={() => deleteFetcher.submit({ intent: "delete" }, { method: "post", action: `/posts/${item.id}` })}>Delete post</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex h-11 items-center text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-ink">Delete</button>
          ))}
        </span>
      </footer>
    </article>
  );
}
