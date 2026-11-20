import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { profile } from "@/db/schema";
import { getAuth } from "./auth";
import { getDb } from "./db";

export type Viewer = {
  user: { id: string; email: string; name: string; image?: string | null };
  profile: typeof profile.$inferSelect | null;
  isAdmin: boolean;
};

export async function getViewer(request: Request): Promise<Viewer | null> {
  const s = await getAuth().api.getSession({ headers: request.headers });
  if (!s) return null;
  const [p] = await getDb().select().from(profile).where(eq(profile.userId, s.user.id)).limit(1);
  const admins = (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return { user: s.user, profile: p ?? null, isAdmin: s.user.emailVerified && admins.includes(s.user.email.toLowerCase()) };
}

const backTo = (request: Request) => {
  const u = new URL(request.url);
  return `/sign-in?next=${encodeURIComponent(u.pathname + u.search)}`;
};

/** Signed in, card may not exist yet. */
export async function requireViewer(request: Request): Promise<Viewer> {
  const v = await getViewer(request);
  if (!v) throw redirect(backTo(request));
  return v;
}

/** Signed in with a finished card; otherwise sent to set one up. */
export async function requireMember(request: Request) {
  const v = await requireViewer(request);
  if (!v.profile) throw redirect("/me/edit");
  return v as Viewer & { profile: NonNullable<Viewer["profile"]> };
}

export const avatarUrl = (p: { avatarKey: string | null } | null, fallback?: string | null) =>
  p?.avatarKey ? `/img/${p.avatarKey}` : fallback ?? null;

/** Admins only. Everyone else gets a plain 404, so the back office doesn't announce itself. Call it in every admin loader AND action. */
export async function requireAdmin(request: Request) {
  const v = await requireViewer(request);
  if (!v.isAdmin) throw new Response("Not found", { status: 404 });
  return v;
}
