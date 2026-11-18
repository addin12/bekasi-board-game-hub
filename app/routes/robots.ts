import { env } from "cloudflare:workers";
import { isSandboxOn } from "@/lib/sandbox";

// Members-only and personal pages stay out of search engines; the sandbox stays out entirely.
export function loader({ request }: { request: Request }) {
  const origin = new URL(request.url).origin;
  const body = isSandboxOn(env.SANDBOX)
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /feed\nDisallow: /find\nDisallow: /search\nDisallow: /notifications\nDisallow: /me/\nDisallow: /plays/\nDisallow: /posts/\nDisallow: /settings\nDisallow: /admin\nDisallow: /sign-in\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
