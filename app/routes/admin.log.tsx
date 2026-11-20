import { formatStamp } from "@/lib/dates";
import { recentLog } from "@/lib/.server/admin";
import { getDb } from "@/lib/.server/db";
import { requireAdmin } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin.log";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return { log: await recentLog(getDb(), 100) };
}

export default function AdminLog({ loaderData }: Route.ComponentProps) {
  const { log } = loaderData;
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground">Every admin action, newest first. Nothing here can be edited or deleted. Showing the last 100.</p>
      {log.length === 0 ? <p className="panel p-6 text-muted-foreground">No admin actions yet</p> : (
        <ul className="panel grid divide-y divide-line">
          {log.map((l) => (
            <li key={l.id} className="grid gap-0.5 px-4 py-3">
              <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-bold">{l.admin ?? "An admin"} · {l.action}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatStamp(l.createdAt)}</span>
              </span>
              <span className="break-all text-sm text-muted-foreground">{l.targetType} {l.targetId}{l.detail ? ` · ${l.detail}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
