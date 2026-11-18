import { env } from "cloudflare:workers";
import type { Route } from "./+types/img";

// Serves uploaded avatars from R2. Keys are random, so the content never changes → cache forever.
export async function loader({ params }: Route.LoaderArgs) {
  const key = params["*"] ?? "";
  if (!/^(avatars|posts)\/[a-z0-9-]+\.(webp|jpg|png)$/.test(key)) throw new Response("Not found", { status: 404 });
  const obj = await env.UPLOADS.get(key);
  if (!obj) throw new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
