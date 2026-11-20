import { useEffect, useRef } from "react";
import { Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import { toast } from "sonner";
import { FeedItemView } from "@/components/feed-item";
import { ReportButton } from "@/components/report-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatStamp } from "@/lib/dates";
import { commentSchema } from "@/lib/validate";
import { getDb } from "@/lib/.server/db";
import { addComment, deleteComment, deletePost, loadPost, toggleLike } from "@/lib/.server/feed";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/posts.$id";

export const meta = () => [{ title: "Post · Bekasi Board Game Hub" }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const v = await requireMember(request);
  const found = await loadPost(getDb(), v.user.id, params.id);
  if (!found) throw new Response("Not found", { status: 404 });
  return { ...found, viewerId: v.user.id, isAdmin: v.isAdmin };
}

export async function action({ request, params }: Route.ActionArgs) {
  const v = await requireMember(request);
  const db = getDb();
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "like") return toggleLike(db, v.user.id, params.id);
  if (intent === "comment") {
    const parsed = commentSchema.safeParse({ body: form.get("body") ?? "" });
    if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Check your comment" };
    return addComment(db, v.user.id, params.id, parsed.data.body);
  }
  if (intent === "delete-comment") return deleteComment(db, v.user.id, String(form.get("commentId") ?? ""), v.isAdmin);
  if (intent === "delete") {
    const res = await deletePost(db, v.user.id, params.id, v.isAdmin);
    if (res.ok) throw redirect("/feed");
    return res;
  }
  return { ok: false as const, message: "Unknown action" };
}

export default function PostPage({ loaderData, actionData }: Route.ComponentProps) {
  const { item, comments, viewerId, isAdmin } = loaderData;
  const busy = useNavigation().state === "submitting";
  const formRef = useRef<HTMLFormElement>(null);
  const del = useFetcher();
  useEffect(() => {
    if (!actionData) return;
    if (!actionData.ok) toast.error(actionData.message);
    else if ("liked" in actionData === false) formRef.current?.reset();
  }, [actionData]);

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link to="/feed" className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4">Back to the feed</Link>
      <FeedItemView item={item} viewerId={viewerId} isAdmin={isAdmin} detail />

      <section aria-labelledby="comments" className="grid gap-3">
        <h2 id="comments" className="text-xl font-extrabold">Comments</h2>
        {comments.length === 0 ? (
          <p className="text-muted-foreground">No comments yet</p>
        ) : (
          <ul className="panel grid divide-y divide-line">
            {comments.map((c) => (
              <li key={c.id} className="grid gap-1 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <Link to={`/p/${c.handle}`} className="font-bold text-ink underline-offset-4 hover:underline">{c.name}</Link> · {formatStamp(c.createdAt)}
                </p>
                <p className="whitespace-pre-line">{c.body}</p>
                <div className="flex flex-wrap gap-x-4">
                  {c.userId !== viewerId && <ReportButton type="comment" id={c.id} what="this comment" />}
                  {(c.userId === viewerId || isAdmin) && (
                    <button type="button" disabled={del.state !== "idle"} onClick={() => del.submit({ intent: "delete-comment", commentId: c.id }, { method: "post" })}
                      className="inline-flex h-11 items-center text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-ink">
                      Delete<span className="sr-only"> this comment</span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Form ref={formRef} method="post" className="panel grid gap-3 p-4">
          <input type="hidden" name="intent" value="comment" />
          <Label htmlFor="comment-body">Add a comment</Label>
          <Textarea id="comment-body" name="body" required maxLength={300} rows={2} />
          <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Sending…" : "Comment"}</Button></div>
        </Form>
      </section>
    </div>
  );
}
