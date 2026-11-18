import { useEffect } from "react";
import { Form, useNavigation } from "react-router";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SITE_DEFAULTS, siteTextSchema } from "@/lib/site-text";
import { loadSiteText, logAdmin, saveSiteText } from "@/lib/.server/admin";
import { getDb } from "@/lib/.server/db";
import { passcodeIsSet, setPasscode } from "@/lib/.server/passcode-store";
import { requireAdmin } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin.site";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  const db = getDb();
  return { site: await loadSiteText(db), isSet: await passcodeIsSet(db) };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireAdmin(request);
  const db = getDb();
  const form = await request.formData();
  if (form.get("intent") === "passcode") {
    const code = String(form.get("passcode") ?? "").trim();
    if (code.length < 6 || code.length > 64) return { scope: "passcode" as const, ok: false as const, message: "Use 6 to 64 characters", errors: {} as Record<string, string> };
    await setPasscode(db, code);
    await logAdmin(db, v.user.id, "passcode.change", "site", "passcode");
    console.warn(JSON.stringify({ event: "passcode_changed", by: v.user.id }));
    return { scope: "passcode" as const, ok: true as const, message: "Passcode changed. Share the new one in the WhatsApp group. Members already verified stay verified", errors: {} as Record<string, string> };
  }
  const parsed = siteTextSchema.safeParse(Object.fromEntries(["homeTitle", "homeIntro", "banner", "contact", "footer"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { scope: "site" as const, ok: false as const, message: "Check the fields marked below", errors };
  }
  await saveSiteText(db, v.user.id, parsed.data);
  return { scope: "site" as const, ok: true as const, message: "Saved. The site shows it right away", errors: {} as Record<string, string> };
}

export default function AdminSite({ loaderData, actionData }: Route.ComponentProps) {
  const { site, isSet } = loaderData;
  const busy = useNavigation().state !== "idle";
  useEffect(() => { if (actionData?.ok) toast.success(actionData.message); }, [actionData]);
  const siteErr = (k: string) => (actionData?.scope === "site" && !actionData.ok ? actionData.errors[k] : undefined) ?? null;
  const passMsg = actionData?.scope === "passcode" ? actionData : null;
  return (
    <div className="grid gap-8">
      <Form method="post" className="panel grid gap-5 p-5">
        <input type="hidden" name="intent" value="site" />
        <div className="grid gap-1">
          <h2 className="text-xl font-extrabold">Site text</h2>
          <p className="text-muted-foreground">Plain text only. Leave the banner empty to hide it.</p>
        </div>
        <Field id="homeTitle" label="Home headline" error={siteErr("homeTitle")}><Input id="homeTitle" name="homeTitle" required maxLength={80} defaultValue={site.homeTitle} aria-invalid={!!siteErr("homeTitle")} /></Field>
        <Field id="homeIntro" label="Home intro" error={siteErr("homeIntro")}><Textarea id="homeIntro" name="homeIntro" required maxLength={300} rows={3} defaultValue={site.homeIntro} aria-invalid={!!siteErr("homeIntro")} /></Field>
        <Field id="banner" label="Banner above every page (optional)" help="For news such as a playday this weekend" error={siteErr("banner")}><Input id="banner" name="banner" maxLength={160} defaultValue={site.banner} placeholder="e.g. Playday this Saturday at Demo Game Cafe" aria-invalid={!!siteErr("banner")} /></Field>
        <Field id="contact" label="How to reach the admins" help="Shown on the privacy and terms pages" error={siteErr("contact")}><Input id="contact" name="contact" required maxLength={200} defaultValue={site.contact} aria-invalid={!!siteErr("contact")} /></Field>
        <Field id="footer" label="Footer line" error={siteErr("footer")}><Input id="footer" name="footer" required maxLength={120} defaultValue={site.footer} aria-invalid={!!siteErr("footer")} /></Field>
        {actionData?.scope === "site" && !actionData.ok && <p role="alert" className="font-semibold text-destructive">{actionData.message}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Original headline: {SITE_DEFAULTS.homeTitle}</p>
          <Button type="submit" disabled={busy}>Save</Button>
        </div>
      </Form>

      <Form method="post" className="panel grid gap-4 p-5">
        <input type="hidden" name="intent" value="passcode" />
        <div className="grid gap-1">
          <h2 className="text-xl font-extrabold">Member passcode</h2>
          <p className="text-muted-foreground">{isSet ? "A passcode is set. Change it from time to time, for example monthly." : "No passcode yet. Members can't get verified until you set one."}</p>
        </div>
        <Field id="passcode" label="New passcode" help="6 to 64 characters. Not case-sensitive. Only a scrambled copy is stored" error={passMsg && !passMsg.ok ? passMsg.message : null}>
          <Input id="passcode" name="passcode" autoComplete="off" required minLength={6} maxLength={64} />
        </Field>
        {passMsg?.ok && <p role="status" className="text-sm font-semibold">{passMsg.message}</p>}
        <div className="flex justify-end"><Button type="submit" disabled={busy}>Set passcode</Button></div>
      </Form>
    </div>
  );
}
