import { useState } from "react";
import { redirect } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient, safeNext } from "@/lib/auth-client";
import { googleEnabled } from "@/lib/.server/auth";
import { getViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/sign-in";

export const meta = () => [{ title: "Sign in · Bekasi Board Game Hub" }];

export async function loader({ request }: Route.LoaderArgs) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  if (await getViewer(request)) throw redirect(next === "/" ? "/find" : next);
  return { google: googleEnabled(), next };
}

export default function SignIn({ loaderData }: Route.ComponentProps) {
  const { google, next } = loaderData;
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const after = next === "/" ? "/find" : next;

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(false);
    if (error) return setError(error.status === 429 ? "Too many codes asked. Wait a few minutes, then try again." : error.message ?? "We couldn't send the code. Check the address and try again.");
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: code.trim() });
    setBusy(false);
    if (error) return setError("That code didn't work. Check it, or ask for a new one.");
    window.location.assign(after); // full load so every loader sees the new session
  }

  return (
    <div className="mx-auto grid max-w-md gap-6">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground">New here? Signing in creates your account. Next you'll set up your player card.</p>
      </div>

      {google && (
        <>
          <Button size="lg" variant="outline" disabled={busy} onClick={() => authClient.signIn.social({ provider: "google", callbackURL: after })}>
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Separator className="flex-1" /> or use your email <Separator className="flex-1" />
          </div>
        </>
      )}

      {step === "email" ? (
        <form onSubmit={sendCode} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="email-help" />
            <p id="email-help" className="text-sm text-muted-foreground">Any email works. We'll send you a 6-digit code.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button size="lg" type="submit" disabled={busy}>{busy ? "Sending…" : "Send me a code"}</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="code">6-digit code</Label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} aria-describedby="code-help" />
            <p id="code-help" className="text-sm text-muted-foreground">Sent to {email}. It works for 10 minutes.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="ghost" onClick={() => { setStep("email"); setCode(""); setError(null); }}>Use another email</Button>
            <Button size="lg" type="submit" disabled={busy}>{busy ? "Checking…" : "Sign in"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
