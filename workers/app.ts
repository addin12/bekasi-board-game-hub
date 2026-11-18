import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env) {
    const res = await requestHandler(request);
    if (env.SANDBOX !== "1") return res;
    // Keep the sandbox (fake data) out of search engines.
    const out = new Response(res.body, res);
    out.headers.set("x-robots-tag", "noindex, nofollow");
    return out;
  },
} satisfies ExportedHandler<Env>;
