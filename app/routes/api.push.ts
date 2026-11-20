import { getDb } from "@/lib/.server/db";
import { pushEnabled, pushToUser, removeSubscription, saveSubscription } from "@/lib/.server/push";
import { requireMember } from "@/lib/.server/viewer";
import { readCapped } from "@/lib/read-body";
import type { Route } from "./+types/api.push";

const json = (body: object, status = 200) => Response.json(body, { status });

/** Turn push on or off for one device, or send a test notice to the member's own devices. JSON in, JSON out. */
export async function action({ request }: Route.ActionArgs) {
  const v = await requireMember(request);
  if (request.method !== "POST") return json({ ok: false, message: "Use POST" }, 405);
  // Same-site check on top of the cookie's SameSite rule: the page that sends this lives on this site.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, message: "Wrong origin" }, 403);
  if (!pushEnabled()) return json({ ok: false, message: "Notifications are not set up on this site yet" }, 503);

  let body: { intent?: unknown; subscription?: unknown; endpoint?: unknown };
  const raw = await readCapped(request, 8 * 1024); // a push subscription is under 1 KB
  if (raw === null) return json({ ok: false, message: "Too big" }, 413);
  try { body = JSON.parse(raw); } catch { return json({ ok: false, message: "Send JSON" }, 400); }
  const db = getDb();

  if (body.intent === "subscribe") {
    const res = await saveSubscription(db, v.user.id, body.subscription);
    return json(res, res.ok ? 200 : 400);
  }
  if (body.intent === "unsubscribe") {
    await removeSubscription(db, v.user.id, body.endpoint);
    return json({ ok: true });
  }
  if (body.intent === "test") {
    const sent = await pushToUser(db, v.user.id, { title: "Notifications are on", body: "This is a test from Bekasi Board Game Hub", url: "/settings", tag: "test" });
    return json(sent > 0 ? { ok: true, sent } : { ok: false, message: "No device accepted the test. Turn notifications off and on again." });
  }
  return json({ ok: false, message: "Unknown action" }, 400);
}
