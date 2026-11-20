import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import * as schema from "@/db/schema";
import { isSandboxEmail, isSandboxOn, SANDBOX_CODE } from "@/lib/sandbox";
import { getDb } from "./db";
import { recordMailFailure } from "./limits";
import { logFailure } from "./log";
import { mailConfigured, sendMail } from "./mail";

export const googleEnabled = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
/** Email codes can actually arrive: a relay is set, or sandbox test addresses, or local dev (console). */
export const emailEnabled = () => mailConfigured() || isSandboxOn(env.SANDBOX) || import.meta.env.DEV;

function createAuth() {
  return betterAuth({
    appName: env.APP_NAME,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    // D1 has no interactive transactions.
    database: drizzleAdapter(getDb(), { provider: "sqlite", schema, transaction: false }),
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    socialProviders: googleEnabled()
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" } }
      : undefined,
    // Email codes exist only where a code can arrive (see emailEnabled). Without mail, the routes do not exist, so nobody can ask for a code that never comes.
    plugins: emailEnabled() ? [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        // Plugin default is 3 per minute per IP for its routes; sandbox testers share Wi-Fi, so loosen it there only.
        rateLimit: isSandboxOn(env.SANDBOX) ? { window: 60, max: 120 } : undefined,
        // Sandbox only: fixed code for name@sandbox.test (undefined → Better Auth's random code).
        generateOTP: ({ email }) => (isSandboxEmail(email, isSandboxOn(env.SANDBOX)) ? SANDBOX_CODE : undefined),
        async sendVerificationOTP({ email, otp }) {
          if (isSandboxEmail(email, isSandboxOn(env.SANDBOX))) return; // nothing to send
          try {
            await sendMail(
              email,
              `${otp} is your ${env.APP_NAME} code`,
              `Your sign-in code is ${otp}\n\nIt works for 10 minutes. If you didn't ask for it, ignore this email.`,
            );
          } catch (e) {
            logFailure("signin_mail_failed", e); // Better Auth still answers 200 to the member, so the log line and the admin overview are the only signs
            await recordMailFailure(getDb(), e);
            throw e;
          }
        },
      }),
    ] : [],
    // Workers have no shared memory between requests, so limits live in D1.
    // Sandbox testers often share one Wi-Fi (one IP), so the code-request limit is looser there.
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30, customRules: { "/email-otp/send-verification-otp": { window: 300, max: isSandboxOn(env.SANDBOX) ? 200 : 3 } } },
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
  });
}

let cached: ReturnType<typeof createAuth> | undefined;
export const getAuth = () => (cached ??= createAuth());
