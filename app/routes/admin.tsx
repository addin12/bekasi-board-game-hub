import { Form, useNavigation } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/lib/.server/db";
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
  return { isSet: await passcodeIsSet(getDb()) };
}

export async function action({ request }: Route.ActionArgs) {
  const v = await requireAdmin(request);
  const code = String((await request.formData()).get("passcode") ?? "").trim();
  if (code.length < 6 || code.length > 64) return { ok: false, text: "Use 6 to 64 characters." };
  await setPasscode(getDb(), code);
  console.warn(JSON.stringify({ event: "passcode_changed", by: v.user.id }));
  return { ok: true, text: "Passcode changed. Share the new one in the WhatsApp group. Members already verified stay verified." };
}

export default function Admin({ loaderData, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <div className="mx-auto grid max-w-xl gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold">Member passcode</h2>
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
