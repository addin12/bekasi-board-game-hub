import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import * as schema from "@/db/schema";
import { getDb } from "./db";
import { sendMail } from "./mail";

export const googleEnabled = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

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
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp }) {
          await sendMail(
            email,
            `${otp} is your ${env.APP_NAME} code`,
            `Your sign-in code is ${otp}\n\nIt works for 10 minutes. If you didn't ask for it, ignore this email.`,
          );
        },
      }),
    ],
    // Workers have no shared memory between requests, so limits live in D1.
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30, customRules: { "/email-otp/send-verification-otp": { window: 300, max: 3 } } },
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
  });
}

let cached: ReturnType<typeof createAuth> | undefined;
export const getAuth = () => (cached ??= createAuth());
