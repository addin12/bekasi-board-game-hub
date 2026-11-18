import { Form, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatStamp } from "@/lib/dates";
import { listMembers } from "@/lib/.server/admin";
import { getDb } from "@/lib/.server/db";
import { requireAdmin } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin.members";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 60);
  const page = Math.max(0, Math.min(Number(sp.get("page")) || 0, 400));
  return { q, page, ...(await listMembers(getDb(), q, page)) };
}

export default function AdminMembers({ loaderData }: Route.ComponentProps) {
  const { q, page, rows, more } = loaderData;
  const href = (p: number) => `/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), ...(p ? { page: String(p) } : {}) })}`;
  return (
    <div className="grid gap-6">
      <Form method="get" role="search" className="flex items-end gap-2">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="q">Name, username or email</Label>
          <Input id="q" name="q" type="search" defaultValue={q} autoComplete="off" />
        </div>
        <Button type="submit">Search</Button>
      </Form>

      {rows.length === 0 ? (
        <p className="panel p-6 text-muted-foreground">{q ? `No member matches "${q}"` : "No members yet"}</p>
      ) : (
        <ul className="panel grid divide-y divide-line">
          {rows.map((m) => (
            <li key={m.userId}>
              <Link to={`/admin/members/${m.handle}`} className="grid min-h-16 gap-0.5 px-4 py-3 hover:bg-muted sm:grid-cols-[1fr_auto] sm:items-center sm:gap-x-4">
                <span className="grid gap-0.5">
                  <span className="font-extrabold">{m.displayName} <span className="font-medium text-muted-foreground">@{m.handle}</span></span>
                  <span className="text-sm text-muted-foreground">{m.email} · {m.district}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums sm:text-right">{m.verified ? "Verified" : "Not verified"}<span className="block font-normal text-muted-foreground">Joined {formatStamp(m.createdAt)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(page > 0 || more) && (
        <div className="flex justify-between">
          {page > 0 ? <Button asChild variant="outline"><Link to={href(page - 1)}>Newer</Link></Button> : <span />}
          {more && <Button asChild variant="outline"><Link to={href(page + 1)}>Older</Link></Button>}
        </div>
      )}
    </div>
  );
}
