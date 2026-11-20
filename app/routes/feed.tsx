import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { Form, Link, useNavigation } from "react-router";
import { toast } from "sonner";
import { FeedItemView } from "@/components/feed-item";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDay } from "@/lib/dates";
import { postSchema } from "@/lib/validate";
import { badgeStatsFor } from "@/lib/.server/cards";
import { getDb } from "@/lib/.server/db";
import { createStatusPost, loadFeed } from "@/lib/.server/feed";
import { pendingPlays } from "@/lib/.server/plays";
import { requireMember } from "@/lib/.server/viewer";
import { count, eq, and } from "drizzle-orm";
import { userGame } from "@/db/schema";
import type { Route } from "./+types/feed";

export const meta = () => [{ title: "Feed · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireMember(request);
  const db = getDb();
  const before = Number(new URL(request.url).searchParams.get("before")) || undefined;
  const [feed, pending, stats, favs, owned] = await Promise.all([
    loadFeed(db, v.user.id, before),
    pendingPlays(db, v.user.id),
    badgeStatsFor(db, v.user.id),
    db.select({ n: count() }).from(userGame).where(and(eq(userGame.userId, v.user.id), eq(userGame.kind, "favorite"))),
    db.select({ n: count() }).from(userGame).where(and(eq(userGame.userId, v.user.id), eq(userGame.kind, "own"))),
  ]);
  // Getting-started checklist: shown until every step is done.
  const steps = [
    { label: "Add a favorite game", done: favs[0].n > 0, to: "/me/edit" },
    { label: "Import your games from BoardGameGeek", done: owned[0].n > 0, to: "/me/edit" },
    { label: "Enter the member passcode", done: Boolean(v.profile.verifiedAt), to: "/settings" },
    { label: "Log your first play", done: stats.plays > 0, to: "/plays/new" },
    { label: "Take the play-style quiz", done: Boolean(v.profile.playStyle), to: "/me/style" },
  ];
  return { viewerId: v.user.id, isAdmin: v.isAdmin, ...feed, pending, steps: steps.every((s) => s.done) ? [] : steps, paged: Boolean(before) };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  const form = await request.formData();
  const parsed = postSchema.safeParse({ body: form.get("body") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your post" };
  const file = form.get("image");
  return createStatusPost(getDb(), v.user.id, parsed.data.body, file instanceof File ? file : null);
}

export default function Feed({ loaderData, actionData }: Route.ComponentProps) {
  const { items, next, pending, steps, viewerId, isAdmin, paged } = loaderData;
  const busy = useNavigation().state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!actionData) return;
    if (actionData.ok) { toast.success("Posted"); formRef.current?.reset(); }
    else toast.error(actionData.message);
  }, [actionData]);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-3xl font-extrabold">Feed</h1>

      {steps.length > 0 && !paged && (
        <section aria-label="Getting started" className="panel grid gap-3 p-5">
          <h2 className="text-lg font-extrabold">Get started</h2>
          <ul className="grid gap-1">
            {steps.map((s) => (
              <li key={s.label}>
                <Link to={s.to} className="flex min-h-11 items-center gap-3 font-semibold">
                  <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink ${s.done ? "bg-ink text-white" : "bg-card"}`}>{s.done && <Check className="size-4" strokeWidth={3} />}</span>
                  <span className={s.done ? "text-muted-foreground line-through" : "underline-offset-4 hover:underline"}>{s.label}</span>
                  {s.done && <span className="sr-only"> (done)</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && !paged && (
        <section aria-label="Plays to confirm" className="panel grid gap-2 p-5">
          <h2 className="text-lg font-extrabold">Were you there?</h2>
          <p className="text-sm text-muted-foreground">These plays count for you once you confirm them</p>
          <ul className="grid gap-1">
            {pending.map((p) => (
              <li key={p.playId}>
                <Link to={`/plays/${p.playId}`} className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 font-semibold underline-offset-4 hover:underline">
                  <span>{p.gameName}</span>
                  <span className="text-sm font-medium text-muted-foreground">{formatDay(p.playedOn)}{p.logger ? ` · logged by ${p.logger}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!paged && (
        <Form ref={formRef} id="write" method="post" encType="multipart/form-data" className="panel grid gap-3 p-4">
          <Label htmlFor="post-body">Write a post</Label>
          <Textarea id="post-body" name="body" maxLength={500} rows={3} placeholder="What did you play, or what are you looking for?" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <Label htmlFor="post-image" className="text-sm font-semibold">Picture (optional)</Label>
              <input id="post-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm file:mr-3 file:h-11 file:rounded-lg file:border-2 file:border-ink file:bg-card file:px-3 file:font-bold" />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Posting…" : "Post"}</Button>
          </div>
        </Form>
      )}

      {items.length === 0 ? (
        <section className="panel grid gap-3 p-6">
          <h2 className="text-lg font-extrabold">Nothing here yet</h2>
          <p className="text-muted-foreground">Plays, tables and posts from the community show up here. Be the first.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to="/plays/new">Log a play</Link></Button>
            <Button asChild variant="outline"><Link to="/tables/new">Open a table</Link></Button>
          </div>
        </section>
      ) : (
        <ul className="grid gap-4">
          {items.map((i) => <li key={i.id}><FeedItemView item={i} viewerId={viewerId} isAdmin={isAdmin} /></li>)}
        </ul>
      )}

      {(next || paged) && (
        <div className="flex justify-between">
          {paged ? <Button asChild variant="outline"><Link to="/feed">Back to newest</Link></Button> : <span />}
          {next && <Button asChild variant="outline"><Link to={`/feed?before=${next}`}>Older posts</Link></Button>}
        </div>
      )}
    </div>
  );
}
