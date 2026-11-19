import { env } from "cloudflare:workers";
import { sendViaGmail } from "./smtp";

/** Email codes can arrive: Gmail is set, or a relay is set. */
export const mailConfigured = () => Boolean((env.GMAIL_USER && env.GMAIL_APP_PASSWORD) || env.MAIL_RELAY_URL);

/**
 * Sends a plain-text email. First choice: Gmail SMTP with an app password (GMAIL_USER + GMAIL_APP_PASSWORD).
 * Second choice: a relay (MAIL_RELAY_URL + MAIL_RELAY_SECRET). With neither, development prints the mail to the console.
 * Production refuses, so nobody waits for a code that never comes.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    await sendViaGmail({ user: env.GMAIL_USER, appPassword: env.GMAIL_APP_PASSWORD, fromName: env.APP_NAME, to, subject, text });
    return;
  }
  if (!env.MAIL_RELAY_URL) {
    if (import.meta.env.DEV) {
      console.log(`\n[mail to ${to}] ${subject}\n${text}\n`);
      return;
    }
    throw new Error("Email sign-in is not set up yet. Use Google sign-in for now.");
  }
  const res = await fetch(env.MAIL_RELAY_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.MAIL_RELAY_SECRET}` },
    body: JSON.stringify({ to, subject, text }),
  });
  if (!res.ok) throw new Error(`Mail relay answered ${res.status}`);
}
