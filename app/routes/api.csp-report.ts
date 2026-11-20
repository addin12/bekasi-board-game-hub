import { logFailure } from "@/lib/.server/log";
import type { Route } from "./+types/api.csp-report";

const MAX_BYTES = 8 * 1024;

/**
 * Receives the browser's report when a page breaks the report-only CSP. It stores nothing. It writes one short log line
 * (the rule, the blocked address, the page path) so an admin can read it in the Worker logs before the policy is enforced.
 * Anyone can post here, so the body is capped and the log line holds only a few short fields.
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return new Response(null, { status: 413 });
  try {
    const raw = (await request.text()).slice(0, MAX_BYTES);
    const json = JSON.parse(raw) as Record<string, unknown>;
    const r = (json["csp-report"] ?? json) as Record<string, unknown>;
    const short = (v: unknown) => String(v ?? "").slice(0, 120);
    const path = (v: unknown) => { try { return new URL(String(v)).pathname.slice(0, 80); } catch { return ""; } };
    console.warn(JSON.stringify({ event: "csp_violation", rule: short(r["violated-directive"] ?? r["effectiveDirective"]), blocked: short(r["blocked-uri"] ?? r["blockedURL"]), page: path(r["document-uri"] ?? r["documentURL"]) }));
  } catch (e) {
    logFailure("csp_report_unreadable", e);
  }
  return new Response(null, { status: 204 });
}
