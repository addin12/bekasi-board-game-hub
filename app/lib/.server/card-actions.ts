import { env } from "cloudflare:workers";
import { and, count, eq, ne } from "drizzle-orm";
import { game, profile, userGame, KINDS, type Kind } from "@/db/schema";
import { formatRupiah, parseRupiah, profileSchema } from "@/lib/validate";
import { BggBusy, ensureGames, importOwned } from "./bgg";
import { refreshHot } from "./cards";
import type { Db } from "./db";
import { tradePost } from "./feed";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const LIMITS: Record<Kind, number> = { favorite: 3, hot: 3, want: 30, own: 300, sell: 30, buy: 30 };
const EDITABLE: Kind[] = ["favorite", "want", "own", "sell", "buy"]; // hot is computed
const AVATAR_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_AVATAR = 2 * 1024 * 1024;

export async function saveProfile(db: Db, userId: string, form: FormData, existing: { bggUsername: string | null; avatarKey: string | null } | null): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    displayName: form.get("displayName") ?? "", handle: form.get("handle") ?? "", district: form.get("district") ?? "",
    bggUsername: form.get("bggUsername") ?? "", bio: form.get("bio") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Check the fields marked below", fieldErrors };
  }
  const v = parsed.data;
  const [taken] = await db.select({ id: profile.userId }).from(profile).where(and(eq(profile.handle, v.handle), ne(profile.userId, userId))).limit(1);
  if (taken) return { ok: false, message: "Check the fields marked below", fieldErrors: { handle: "Someone already uses this username. Try adding a number or your district." } };

  let avatarKey = existing?.avatarKey ?? null;
  const file = form.get("avatar");
  if (file instanceof File && file.size > 0) {
    const ext = AVATAR_TYPES[file.type];
    if (!ext) return { ok: false, message: "Check the fields marked below", fieldErrors: { avatar: "Use a JPG, PNG or WebP picture" } };
    if (file.size > MAX_AVATAR) return { ok: false, message: "Check the fields marked below", fieldErrors: { avatar: "Pick a picture under 2 MB." } };
    const key = `avatars/${crypto.randomUUID()}.${ext}`;
    await env.UPLOADS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    if (avatarKey) await env.UPLOADS.delete(avatarKey);
    avatarKey = key;
  }

  const values = { displayName: v.displayName, handle: v.handle, district: v.district, bggUsername: v.bggUsername, bio: v.bio, avatarKey, updatedAt: new Date() };
  await db.insert(profile).values({ userId, ...values }).onConflictDoUpdate({ target: profile.userId, set: values });
  if (!existing || existing.bggUsername !== v.bggUsername) await refreshHot(db, userId, v.bggUsername);
  return { ok: true, message: existing ? "Card saved" : "Your card is ready" };
}

export async function addGame(db: Db, userId: string, form: FormData): Promise<ActionResult> {
  const kind = String(form.get("kind")) as Kind;
  const bggId = Number(form.get("bggId"));
  if (!EDITABLE.includes(kind) || !Number.isInteger(bggId) || bggId <= 0) return { ok: false, message: "That game couldn't be added" };
  const [{ n }] = await db.select({ n: count() }).from(userGame).where(and(eq(userGame.userId, userId), eq(userGame.kind, kind)));
  if (n >= LIMITS[kind]) return { ok: false, message: kind === "favorite" ? "You can pick 3 favorites. Remove one first." : `This list is full (${LIMITS[kind]}).` };
  const rawPrice = String(form.get("price") ?? "");
  const price = kind === "sell" || kind === "buy" ? parseRupiah(rawPrice) : null;
  if (kind === "sell" && rawPrice && price === null) return { ok: false, message: "Write the price in rupiah, like 350000 or 350k" };
  const condition = kind === "sell" ? String(form.get("condition") ?? "").slice(0, 40) || null : null;
  try {
    await ensureGames(db, [bggId]);
  } catch {
    return { ok: false, message: "BoardGameGeek isn't answering. Try again in a minute." };
  }
  const [already] = await db.select({ b: userGame.bggId }).from(userGame).where(and(eq(userGame.userId, userId), eq(userGame.bggId, bggId), eq(userGame.kind, kind))).limit(1);
  await db.insert(userGame).values({ userId, bggId, kind, position: n, price, condition }).onConflictDoUpdate({
    target: [userGame.userId, userGame.bggId, userGame.kind], set: { price, condition },
  });
  if (kind === "sell" && !already) {
    const [g] = await db.select({ name: game.name }).from(game).where(eq(game.bggId, bggId)).limit(1);
    if (g) await tradePost(db, userId, bggId, `is selling ${g.name}${price ? ` for ${formatRupiah(price)}` : ""}`);
  }
  return { ok: true, message: "Added" };
}

/** The deal happened: take it off the card and say so in the feed. Counts toward the Trader badge. */
export async function markSold(db: Db, userId: string, form: FormData): Promise<ActionResult> {
  const bggId = Number(form.get("bggId"));
  const [row] = await db.select({ name: game.name }).from(userGame).innerJoin(game, eq(game.bggId, userGame.bggId))
    .where(and(eq(userGame.userId, userId), eq(userGame.kind, "sell"), eq(userGame.bggId, bggId))).limit(1);
  if (!row) return { ok: false, message: "That game isn't on your selling list" };
  await db.delete(userGame).where(and(eq(userGame.userId, userId), eq(userGame.kind, "sell"), eq(userGame.bggId, bggId)));
  await tradePost(db, userId, bggId, `sold ${row.name}`);
  return { ok: true, message: "Marked as sold" };
}

export async function removeGame(db: Db, userId: string, form: FormData): Promise<ActionResult> {
  const kind = String(form.get("kind")) as Kind;
  const bggId = Number(form.get("bggId"));
  if (!KINDS.includes(kind) || kind === "hot") return { ok: false, message: "That game couldn't be removed" };
  await db.delete(userGame).where(and(eq(userGame.userId, userId), eq(userGame.kind, kind), eq(userGame.bggId, bggId)));
  return { ok: true, message: "Removed" };
}

export async function importOwnedGames(db: Db, userId: string, bggUsername: string | null): Promise<ActionResult> {
  if (!bggUsername) return { ok: false, message: "Add your BGG username to your card first" };
  try {
    const ids = await importOwned(db, bggUsername, LIMITS.own);
    if (!ids.length) return { ok: true, message: "BGG shows no owned games for this username" };
    const rows = ids.map((bggId, position) => db.insert(userGame).values({ userId, bggId, kind: "own" as const, position }).onConflictDoNothing());
    for (let i = 0; i < rows.length; i += 50) await db.batch(rows.slice(i, i + 50) as [any, ...any[]]);
    return { ok: true, message: `Imported ${ids.length} owned games from BGG.` };
  } catch (e) {
    if (e instanceof BggBusy) return { ok: false, message: "BGG is preparing your collection. Try again in about a minute." };
    return { ok: false, message: "BoardGameGeek isn't answering. Try again in a minute." };
  }
}
