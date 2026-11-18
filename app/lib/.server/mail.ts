import { env } from "cloudflare:workers";

/**
 * Sends a plain-text email through the relay (MAIL_RELAY_URL + MAIL_RELAY_SECRET).
 * Without a relay, development prints the mail to the console; production refuses so nobody waits for a code that never comes.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
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
