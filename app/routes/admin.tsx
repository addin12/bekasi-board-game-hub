import { Form, Link, useFetcher, useNavigation } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatStamp } from "@/lib/dates";
import { getDb } from "@/lib/.server/db";
import { openReports, removeReported, resolveReport } from "@/lib/.server/moderation";
import { passcodeIsSet, setPasscode } from "@/lib/.server/passcode-store";
import { requireViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin";

export const meta = () => [{ title: "Admin · Bekasi Board Game Hub" }];

async function requireAdmin(request: Request) {
  const v = await requireViewer(request);
  if (!v.isAdmin) throw new Response("Not found", { status: 404 });
  return v;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  return { isSet: await passcodeIsSet(db), reports: await openReports(db) };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireAdmin(request);
  const db = getDb();
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "resolve" || intent === "remove") {
    const id = String(form.get("reportId") ?? "");
    if (intent === "remove") await removeReported(db, String(form.get("type") ?? ""), String(form.get("targetId") ?? ""));
    await resolveReport(db, id);
    console.warn(JSON.stringify({ event: intent === "remove" ? "report_removed_content" : "report_resolved", by: v.user.id }));
    return { ok: true, text: "Done." };
  }
  const code = String(form.get("passcode") ?? "").trim();
  if (code.length < 6 || code.length > 64) return { ok: false, text: "Use 6 to 64 characters." };
  await setPasscode(db, code);
  console.warn(JSON.stringify({ event: "passcode_changed", by: v.user.id }));
  return { ok: true, text: "Passcode changed. Share the new one in the WhatsApp group. Members already verified stay verified." };
}

const REMOVABLE = new Set(["post", "comment", "table", "place"]);

export default function Admin({ loaderData, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const f = useFetcher();
  const { reports } = loaderData;
  return (
    <div className="mx-auto grid max-w-2xl gap-8">
      <h1 className="text-3xl font-extrabold">Admin</h1>

      <section aria-labelledby="reports" className="panel grid gap-4 p-5">
        <h2 id="reports" className="text-xl font-extrabold">Reports <span className="tabular-nums text-muted-foreground">{reports.length}</span></h2>
        {reports.length === 0 ? <p className="text-muted-foreground">Nothing reported.</p> : (
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

      <section className="panel grid gap-4 p-5">
        <div className="grid gap-1">
          <h2 className="text-xl font-extrabold">Member passcode</h2>
          <p className="text-muted-foreground">{loaderData.isSet ? "A passcode is set. Change it from time to time, for example monthly." : "No passcode yet. Members can't get verified until you set one."}</p>
        </div>
        <Form method="post" className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="passcode">New passcode</Label>
            <Input id="passcode" name="passcode" autoComplete="off" required minLength={6} maxLength={64} aria-describedby="pc-msg" />
            <p id="pc-msg" role={actionData ? "alert" : undefined} className={actionData && !actionData.ok ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
              {actionData?.text ?? "6 to 64 characters. Not case-sensitive. Only a scrambled copy is stored."}
            </p>
          </div>
          <div className="flex justify-end"><Button type="submit" disabled={busy}>Set passcode</Button></div>
        </Form>
      </section>
    </div>
  );
}
