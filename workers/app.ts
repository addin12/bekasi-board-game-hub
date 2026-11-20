import { createRequestHandler } from "react-router";
import { getDb } from "../app/lib/.server/db";
import { withBasicHeaders } from "../app/lib/security-headers";
import { scheduledCheck } from "../app/lib/.server/limits";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const out = withBasicHeaders(await requestHandler(request)); // security headers on every response (audit H1)
    // Keep the sandbox (fake data) out of search engines.
    if (env.SANDBOX === "1") out.headers.set("x-robots-tag", "noindex, nofollow");
    return out;
  },
  // Every few hours (wrangler.jsonc, triggers): measure the free-plan numbers and send the 80% and 95% messages when they are due.
  async scheduled(_controller, _env, ctx) {
    ctx.waitUntil(scheduledCheck(getDb()).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
