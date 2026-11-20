import { useEffect } from "react";
import { Link, useFetcher } from "react-router";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { formatStamp } from "@/lib/dates";
import { CONTENT_TYPES, type ContentType } from "@/lib/admin-types";
import { listContent, removeContent } from "@/lib/.server/admin";
import { getDb } from "@/lib/.server/db";
import { requireAdmin } from "@/lib/.server/viewer";
import { cn } from "@/lib/utils";
import type { Route } from "./+types/admin.content";

const LABEL: Record<ContentType, string> = { posts: "Posts", comments: "Comments", places: "Places", tables: "Tables", plays: "Plays" };
const asType = (s: string | null): ContentType => (CONTENT_TYPES as readonly string[]).includes(s ?? "") ? (s as ContentType) : "posts";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const type = asType(sp.get("type"));
  const page = Math.max(0, Math.min(Number(sp.get("page")) || 0, 400));
  return { type, page, ...(await listContent(getDb(), type, page)) };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireAdmin(request);
  const form = await request.formData();
  if (form.get("intent") !== "remove") return { ok: false as const, message: "Unknown action" };
  const res = await removeContent(getDb(), v.user.id, asType(String(form.get("type"))), String(form.get("id") ?? ""));
  return res.ok ? { ok: true as const, message: "Removed" } : res;
}

const lookAt = (type: ContentType, id: string) =>
  type === "posts" ? `/posts/${id}` : type === "tables" ? `/tables/${id}` : type === "plays" ? `/plays/${id}` : type === "places" ? `/admin/places/${id}` : null;

export default function AdminContent({ loaderData }: Route.ComponentProps) {
  const { type, page, rows, more } = loaderData;
  const f = useFetcher<{ ok: boolean; message: string }>();
  useEffect(() => { if (f.data) (f.data.ok ? toast.success : toast.error)(f.data.message); }, [f.data]);
  const href = (t: ContentType, p = 0) => `/admin/content?type=${t}${p ? `&page=${p}` : ""}`;
  return (
    <div className="grid gap-6">
      <nav aria-label="Content type" className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map((t) => (
          <Link key={t} to={href(t)} aria-current={t === type ? "page" : undefined}
            className={cn("inline-flex min-h-11 items-center rounded-full border-2 border-ink px-4 font-bold", t === type ? "bg-ink text-white" : "bg-card hover:bg-muted")}>
            {LABEL[t]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? <p className="panel p-6 text-muted-foreground">Nothing here yet</p> : (
        <ul className="panel grid divide-y divide-line">
          {rows.map((r) => {
            const look = lookAt(type, r.id);
            return (
              <li key={r.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-x-4">
                <span className="grid min-w-0 gap-0.5">
                  <span className="break-words font-bold">{r.title}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{r.meta} · {formatStamp(r.at)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {look && <Button asChild variant="outline" size="sm"><Link to={look}>{type === "places" ? "Edit" : "Look at it"}</Link></Button>}
                  {!(type === "tables" && r.meta.endsWith("cancelled")) && !(type === "tables" && r.meta.endsWith("done")) && (
                    <ConfirmButton label={type === "tables" ? "Cancel" : "Delete"} confirmLabel={type === "tables" ? "Cancel table" : "Yes, delete it"} disabled={f.state !== "idle"} onConfirm={() => f.submit({ intent: "remove", type, id: r.id }, { method: "post" })} />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {(page > 0 || more) && (
        <div className="flex justify-between">
          {page > 0 ? <Button asChild variant="outline"><Link to={href(type, page - 1)}>Newer</Link></Button> : <span />}
          {more && <Button asChild variant="outline"><Link to={href(type, page + 1)}>Older</Link></Button>}
        </div>
      )}
    </div>
  );
}
