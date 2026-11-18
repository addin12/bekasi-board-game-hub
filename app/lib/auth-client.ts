import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [emailOTPClient()] });

/** Only same-site paths; anything else falls back to home (no open redirects). */
export const safeNext = (raw: string | null | undefined) =>
  raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
