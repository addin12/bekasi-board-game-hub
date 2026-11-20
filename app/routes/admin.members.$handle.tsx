import { useEffect } from "react";
import { Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, selectClass } from "@/components/field";
import { PersonAvatar } from "@/components/game-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatStamp } from "@/lib/dates";
import { DISTRICT_GROUPS } from "@/lib/districts";
import { deleteMemberAccount, loadMemberForAdmin, removeMemberPhoto, setVerified, updateMember } from "@/lib/.server/admin";
import { getDb } from "@/lib/.server/db";
import { requireAdmin } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin.members.$handle";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const m = await loadMemberForAdmin(getDb(), params.handle);
  if (!m) throw new Response("Not found", { status: 404 });
  return { m };
}

export async function action({ request, params }: Route.ActionArgs) {
  const v = await requireAdmin(request);
  const db = getDb();
  const m = await loadMemberForAdmin(db, params.handle);
  if (!m) throw new Response("Not found", { status: 404 });
  const form = await request.formData();
  switch (form.get("intent")) {
    case "save": return updateMember(db, v.user.id, m.userId, form);
    case "verify": await setVerified(db, v.user.id, m.userId, true); return { ok: true as const, message: "Marked as verified" };
    case "unverify": await setVerified(db, v.user.id, m.userId, false); return { ok: true as const, message: "Verification removed" };
    case "remove-photo": await removeMemberPhoto(db, v.user.id, m.userId); return { ok: true as const, message: "Photo removed" };
    case "delete": {
      const res = await deleteMemberAccount(db, v.user.id, m.userId, m.handle, m.email);
      if (res.ok) throw redirect("/admin/members");
      return res;
    }
  }
  return { ok: false as const, message: "Unknown action" };
}

export default function AdminMember({ loaderData, actionData }: Route.ComponentProps) {
  const { m } = loaderData;
  const nav = useNavigation();
  const busy = nav.state !== "idle";
  const f = useFetcher<{ ok: boolean; message: string }>();
  useEffect(() => { if (f.data) (f.data.ok ? toast.success : toast.error)(f.data.message); }, [f.data]);
  useEffect(() => { if (actionData && "message" in actionData && actionData.ok) toast.success(actionData.message); }, [actionData]);
  const errors = actionData && !actionData.ok && "errors" in actionData ? (actionData.errors as Record<string, string>) : {};
  const act = (intent: string) => f.submit({ intent }, { method: "post" });

  return (
    <div className="grid gap-6">
      <Link to="/admin/members" className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4">All members</Link>

      <header className="flex items-center gap-4">
        <PersonAvatar src={m.avatarKey ? `/img/${m.avatarKey}` : null} name={m.displayName} size={64} />
        <div className="grid min-w-0 gap-0.5">
          <h2 className="text-2xl font-extrabold">{m.displayName} <span className="text-lg font-medium text-muted-foreground">@{m.handle}</span></h2>
          <p className="text-sm text-muted-foreground">{m.email} · joined {formatStamp(m.createdAt)}</p>
          <p className="text-sm font-semibold tabular-nums">{m.counts.games} games on card · {m.counts.plays} plays · {m.counts.posts} posts{m.isAdmin ? " · admin" : ""}</p>
        </div>
      </header>

      <section aria-label="Quick actions" className="panel flex flex-wrap items-center gap-2 p-4">
        <Button asChild variant="outline"><Link to={`/p/${m.handle}`}>View public card</Link></Button>
        {m.verified
          ? <Button variant="outline" disabled={f.state !== "idle"} onClick={() => act("unverify")}>Remove verification</Button>
          : <Button disabled={f.state !== "idle"} onClick={() => act("verify")}>Mark as verified</Button>}
        {m.avatarKey && <Button variant="outline" disabled={f.state !== "idle"} onClick={() => act("remove-photo")}>Remove photo</Button>}
      </section>

      <Form method="post" className="panel grid gap-5 p-5">
        <input type="hidden" name="intent" value="save" />
        <h2 className="text-xl font-extrabold">Edit details</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="displayName" label="Name" error={errors.displayName}><Input id="displayName" name="displayName" required maxLength={40} defaultValue={m.displayName} aria-invalid={!!errors.displayName} /></Field>
          <Field id="district" label="District" error={errors.district}>
            <select id="district" name="district" required defaultValue={m.district} className={selectClass} aria-invalid={!!errors.district}>
              {DISTRICT_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>)}
            </select>
          </Field>
          <Field id="bggUsername" label="BoardGameGeek username" error={errors.bggUsername} className="sm:col-span-2"><Input id="bggUsername" name="bggUsername" maxLength={40} defaultValue={m.bggUsername ?? ""} aria-invalid={!!errors.bggUsername} /></Field>
          <Field id="bio" label="About" error={errors.bio} className="sm:col-span-2"><Textarea id="bio" name="bio" maxLength={280} rows={3} defaultValue={m.bio} aria-invalid={!!errors.bio} /></Field>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={busy}>Save</Button></div>
      </Form>

      <section className="panel grid gap-3 p-5">
        <h2 className="text-xl font-extrabold">Delete account</h2>
        {m.isAdmin ? (
          <p className="text-muted-foreground">This member is an admin. Remove them from the admin list before deleting the account.</p>
        ) : (
          <>
            <p className="text-muted-foreground">Removes the card, photo, posts, comments and hosted tables. It can't be undone, and the member is not told.</p>
            <div><ConfirmButton size="default" label="Delete this account" confirmLabel="Yes, delete account" disabled={f.state !== "idle"} onConfirm={() => act("delete")} /></div>
          </>
        )}
      </section>
    </div>
  );
}
