import { Form, Link, useNavigation } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDb } from "@/lib/.server/db";
import { verifyMember } from "@/lib/.server/passcode-store";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/settings";

export const meta = () => [{ title: "Settings · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireMember(request);
  return { email: v.user.email, verified: Boolean(v.profile.verifiedAt), handle: v.profile.handle };
}

const MESSAGES = {
  verified: { ok: true, text: "You're now a verified member. The badge shows on your card." },
  wrong: { ok: false, text: "That passcode isn't right. Ask an admin in the WhatsApp group for the current one." },
  too_many: { ok: false, text: "Too many tries. Wait an hour, then try again." },
  not_set: { ok: false, text: "Verification isn't open yet. An admin needs to set the passcode first." },
} as const;

export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  const code = String((await request.formData()).get("passcode") ?? "").slice(0, 64);
  if (!code.trim()) return { ok: false, text: "Enter the passcode." };
  return MESSAGES[await verifyMember(getDb(), v.user.id, code)];
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state !== "idle";
  return (
    <div className="mx-auto grid max-w-xl gap-8">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="grid gap-2 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Account</h2>
        <p className="text-muted-foreground">Signed in as <span className="text-foreground">{loaderData.email}</span></p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline"><Link to="/me/edit">Edit my card</Link></Button>
          <Form method="post" action="/sign-out"><Button variant="ghost" type="submit">Sign out</Button></Form>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold">Verified member</h2>
          <p className="text-muted-foreground">Members of our WhatsApp group get a passcode from the admins. Enter it here to get the verified badge.</p>
        </div>
        {loaderData.verified ? (
          <p className="font-medium">You're a verified member.</p>
        ) : (
          <Form method="post" className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="passcode">Member passcode</Label>
              <Input id="passcode" name="passcode" autoComplete="off" required maxLength={64} aria-describedby="passcode-msg" />
              <p id="passcode-msg" role={actionData ? "alert" : undefined} className={actionData ? (actionData.ok ? "text-sm" : "text-sm text-destructive") : "text-sm text-muted-foreground"}>
                {actionData?.text ?? "5 tries per hour."}
              </p>
            </div>
            <div className="flex justify-end"><Button type="submit" disabled={busy}>Verify me</Button></div>
          </Form>
        )}
      </section>
    </div>
  );
}
