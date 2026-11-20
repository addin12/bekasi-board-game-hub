import { and, desc, eq, isNull } from "drizzle-orm";
import { useEffect } from "react";
import { Link, useFetcher } from "react-router";
import { notification } from "@/db/schema";
import { formatStamp } from "@/lib/dates";
import { getDb } from "@/lib/.server/db";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/notifications";

export const meta = () => [{ title: "Notifications · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireMember(request);
  const db = getDb();
  const rows = await db.select().from(notification).where(eq(notification.userId, v.user.id)).orderBy(desc(notification.createdAt)).limit(50);
  return { items: rows.map((r) => ({ id: r.id, text: r.text, href: r.href, isNew: !r.readAt, at: r.createdAt.getTime() })) };
}

/** Marking messages as read changes data, so it is a POST. A link prefetch or a crawler that only reads the page never triggers it. */
export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  await getDb().update(notification).set({ readAt: new Date() }).where(and(eq(notification.userId, v.user.id), isNull(notification.readAt)));
  return { ok: true };
}

export default function Notifications({ loaderData }: Route.ComponentProps) {
  const { items } = loaderData;
  const markRead = useFetcher();
  // The page shows which messages were new. Once it is on screen, the browser tells the site they were read.
  useEffect(() => {
    if (items.some((n) => n.isNew)) markRead.submit({}, { method: "post" });
  }, []);
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-3xl font-extrabold">Notifications</h1>
      {items.length === 0 ? (
        <section className="panel grid gap-2 p-6">
          <h2 className="text-lg font-extrabold">Nothing yet</h2>
          <p className="text-muted-foreground">You'll see it here when someone joins your table, adds you to a play or comments on your post</p>
        </section>
      ) : (
        <ul className="panel grid divide-y divide-line">
          {items.map((n) => (
            <li key={n.id}>
              <Link to={n.href} className="grid min-h-14 gap-0.5 px-4 py-3 hover:bg-muted">
                <span className={n.isNew ? "font-extrabold" : "font-semibold"}>{n.isNew && <span className="mr-2 rounded bg-ink px-2 py-0.5 text-xs font-bold text-white">New</span>}{n.text}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatStamp(n.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
