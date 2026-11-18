import { Link, useFetcher } from "react-router";
import { Button } from "@/components/ui/button";
import { formatStamp } from "@/lib/dates";
import { adminStats, logAdmin, recentLog } from "@/lib/.server/admin";
import { getDb } from "@/lib/.server/db";
import { openReports, removeReported, resolveReport } from "@/lib/.server/moderation";
import { requireAdmin } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin._index";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  const [stats, reports, log] = await Promise.all([adminStats(db), openReports(db), recentLog(db, 8)]);
  return { stats, reports, log };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireAdmin(request);
  const db = getDb();
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent !== "resolve" && intent !== "remove") return { ok: false as const, message: "Unknown action" };
  const type = String(form.get("type") ?? "");
  const targetId = String(form.get("targetId") ?? "");
  if (intent === "remove") await removeReported(db, type, targetId);
  await resolveReport(db, String(form.get("reportId") ?? ""));
  await logAdmin(db, v.user.id, intent === "remove" ? "report.remove_content" : "report.handled", type || "report", targetId || String(form.get("reportId") ?? ""));
  return { ok: true as const, message: "Done" };
}

const REMOVABLE = new Set(["post", "comment", "table", "place"]);

export default function AdminOverview({ loaderData }: Route.ComponentProps) {
  const { stats, reports, log } = loaderData;
  const f = useFetcher();
  const tiles: [string, number][] = [
    ["Members", stats.members], ["Verified", stats.verified], ["Plays", stats.plays], ["Open tables", stats.tables],
    ["Posts", stats.posts], ["Comments", stats.comments], ["Places", stats.places], ["Open reports", stats.reports],
  ];
  return (
    <div className="grid gap-8">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {tiles.map(([label, n]) => (
          <div key={label} className="grid gap-1 bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="reports" className="panel grid gap-4 p-5">
        <h2 id="reports" className="text-xl font-extrabold">Reports</h2>
        {reports.length === 0 ? <p className="text-muted-foreground">Nothing reported</p> : (
          <ul className="grid divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id} className="grid gap-2 py-3 first:pt-0 last:pb-0">
                <p className="text-sm text-muted-foreground tabular-nums">{formatStamp(r.createdAt)} · {r.type} · reported by {r.reporter ?? "a deleted member"}</p>
                <p className="whitespace-pre-line font-semibold">{r.reason}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {r.href && <Button asChild variant="outline" size="sm"><Link to={r.href}>Look at it</Link></Button>}
                  <Button size="sm" variant="outline" disabled={f.state !== "idle"} onClick={() => f.submit({ intent: "resolve", reportId: r.id }, { method: "post" })}>Mark handled</Button>
                  {REMOVABLE.has(r.type) && (
                    <Button size="sm" variant="destructive" disabled={f.state !== "idle"} onClick={() => f.submit({ intent: "remove", reportId: r.id, type: r.type, targetId: r.targetId }, { method: "post" })}>
                      {r.type === "table" ? "Cancel table" : "Remove it"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="recent" className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent" className="text-xl font-extrabold">Latest admin actions</h2>
          <Link to="/admin/log" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">See all</Link>
        </div>
        {log.length === 0 ? <p className="text-muted-foreground">No admin actions yet</p> : (
          <ul className="panel grid divide-y divide-line">
            {log.map((l) => (
              <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-3">
                <span className="font-semibold">{l.admin ?? "An admin"} · {l.action}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatStamp(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
