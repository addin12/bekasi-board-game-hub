import { useEffect } from "react";
import { Form, Link, redirect, useFetcher, useNavigation } from "react-router";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, selectClass } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DISTRICT_GROUPS } from "@/lib/districts";
import { placeSchema } from "@/lib/validate";
import { loadPlaceForAdmin, removeContent, updatePlaceAsAdmin } from "@/lib/.server/admin";
import { getDb } from "@/lib/.server/db";
import { requireAdmin } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin.places.$id";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdmin(request);
  const p = await loadPlaceForAdmin(getDb(), params.id);
  if (!p) throw new Response("Not found", { status: 404 });
  return { p };
}

export async function action({ request, params }: Route.ActionArgs) {
  const v = await requireAdmin(request);
  const db = getDb();
  const form = await request.formData();
  if (form.get("intent") === "delete") {
    await removeContent(db, v.user.id, "places", params.id);
    throw redirect("/admin/content?type=places");
  }
  const parsed = placeSchema.safeParse({ name: form.get("name") ?? "", district: form.get("district") ?? "", address: form.get("address") ?? "", mapUrl: form.get("mapUrl") ?? "", note: form.get("note") ?? "" });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false as const, errors };
  }
  await updatePlaceAsAdmin(db, v.user.id, params.id, parsed.data);
  return { ok: true as const, errors: {} as Record<string, string> };
}

export default function AdminPlace({ loaderData, actionData }: Route.ComponentProps) {
  const { p } = loaderData;
  const busy = useNavigation().state !== "idle";
  const del = useFetcher();
  useEffect(() => { if (actionData?.ok) toast.success("Saved"); }, [actionData]);
  const err = (k: string) => (actionData && !actionData.ok ? actionData.errors[k] : undefined) ?? null;
  return (
    <div className="grid gap-6">
      <Link to="/admin/content?type=places" className="inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-4">All places</Link>
      <Form method="post" className="panel grid gap-5 p-5">
        <h2 className="text-xl font-extrabold">Edit place</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Name" error={err("name")}><Input id="name" name="name" required maxLength={60} defaultValue={p.name} aria-invalid={!!err("name")} /></Field>
          <Field id="district" label="District" error={err("district")}>
            <select id="district" name="district" required defaultValue={p.district} className={selectClass}>
              {DISTRICT_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>)}
            </select>
          </Field>
          <Field id="address" label="Address" error={err("address")} className="sm:col-span-2"><Input id="address" name="address" maxLength={120} defaultValue={p.address} /></Field>
          <Field id="mapUrl" label="Google Maps link" error={err("mapUrl")} className="sm:col-span-2"><Input id="mapUrl" name="mapUrl" type="url" maxLength={300} defaultValue={p.mapUrl ?? ""} aria-invalid={!!err("mapUrl")} /></Field>
          <Field id="note" label="Good to know" error={err("note")} className="sm:col-span-2"><Textarea id="note" name="note" maxLength={200} rows={2} defaultValue={p.note} /></Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ConfirmButton size="default" label="Delete place" confirmLabel="Delete for good" disabled={del.state !== "idle"} onConfirm={() => del.submit({ intent: "delete" }, { method: "post" })} />
          <Button type="submit" disabled={busy}>Save</Button>
        </div>
      </Form>
    </div>
  );
}
