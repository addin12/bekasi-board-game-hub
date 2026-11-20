import { Form, redirect, useNavigation } from "react-router";
import { Field, selectClass } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DISTRICT_GROUPS } from "@/lib/districts";
import { placeSchema } from "@/lib/validate";
import { getDb } from "@/lib/.server/db";
import { createPlace } from "@/lib/.server/places";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/places.new";

export const meta = () => [{ title: "Add a place · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  await requireMember(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  const f = await request.formData();
  const parsed = placeSchema.safeParse({ name: f.get("name") ?? "", district: f.get("district") ?? "", address: f.get("address") ?? "", mapUrl: f.get("mapUrl") ?? "", note: f.get("note") ?? "" });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false as const, message: "Check the fields marked below", errors };
  }
  const res = await createPlace(getDb(), v.user.id, parsed.data);
  if (res.ok) throw redirect(`/places/${res.id}`);
  return { ...res, errors: {} as Record<string, string> };
}

export default function NewPlace({ actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  const err = (k: string) => (actionData && !actionData.ok ? actionData.errors?.[k] : undefined) ?? null;
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-3xl font-extrabold">Add a place</h1>
      <Form method="post" className="panel grid gap-5 p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Name" error={err("name")}><Input id="name" name="name" required maxLength={60} aria-invalid={!!err("name")} /></Field>
          <Field id="district" label="District" error={err("district")}>
            <select id="district" name="district" required defaultValue="" className={selectClass} aria-invalid={!!err("district")}>
              <option value="" disabled>Pick the district</option>
              {DISTRICT_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>)}
            </select>
          </Field>
          <Field id="address" label="Address (optional)" error={err("address")} className="sm:col-span-2"><Input id="address" name="address" maxLength={120} /></Field>
          <Field id="mapUrl" label="Google Maps link (optional)" error={err("mapUrl")} help="Paste the share link from Google Maps" className="sm:col-span-2"><Input id="mapUrl" name="mapUrl" type="url" inputMode="url" maxLength={300} placeholder="https://maps.app.goo.gl/..." aria-invalid={!!err("mapUrl")} /></Field>
          <Field id="note" label="Good to know (optional)" error={err("note")} className="sm:col-span-2"><Textarea id="note" name="note" maxLength={200} rows={2} placeholder="Opening hours, table fee, number of tables" /></Field>
        </div>
        {actionData && !actionData.ok && <p role="alert" className="font-semibold text-destructive">{actionData.message}</p>}
        <div className="flex justify-end"><Button size="lg" type="submit" disabled={busy}>{busy ? "Saving…" : "Add place"}</Button></div>
      </Form>
    </div>
  );
}
