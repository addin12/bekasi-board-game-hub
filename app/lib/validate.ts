import { z } from "zod";
import { fromInputValue, isIsoDay, todayWib } from "./dates";
import { DISTRICTS } from "./districts";

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
// Handles that would clash with routes or impersonate staff.
const RESERVED = new Set(["admin", "api", "find", "settings", "sign_in", "me", "g", "p", "img", "moderator", "staff"]);

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(40, "Use 40 characters or fewer"),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE_RE, "Use 3–20 lowercase letters, numbers or _")
    .refine((h) => !RESERVED.has(h), "That username is reserved. Pick another."),
  district: z.string().refine((d) => DISTRICTS.includes(d), "Pick your district from the list"),
  bggUsername: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9_ .-]*$/, "BGG usernames use letters, numbers, spaces, _ . or -.")
    .transform((s) => s || null),
  bio: z.string().trim().max(280, "Keep it to 280 characters"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Rupiah from user input like "350.000", "350000" or "Rp 350k". */
export function parseRupiah(raw: string): number | null {
  const s = raw.toLowerCase().replace(/rp|\s/g, "");
  if (!s) return null;
  const k = s.endsWith("k");
  const digits = (k ? s.slice(0, -1) : s).replace(/[.,]/g, "");
  if (!/^\d{1,9}$/.test(digits)) return null;
  const n = Number(digits) * (k ? 1000 : 1);
  return n > 0 && n <= 100_000_000 ? n : null;
}

export const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

export function suggestHandle(source: string): string {
  const base = source.toLowerCase().split("@")[0].replace(/[^a-z0-9_]/g, "").slice(0, 16);
  return base.length >= 3 ? base : `player${base}`;
}

// ---------- Phase 2 inputs ----------

export const postSchema = z.object({ body: z.string().trim().max(500, "Keep posts to 500 characters") });
export const commentSchema = z.object({ body: z.string().trim().min(1, "Write something first").max(300, "Keep comments to 300 characters") });

const httpsUrl = z.string().trim().max(300).refine((u) => { try { return new URL(u).protocol === "https:"; } catch { return false; } }, "Use a full https:// link");

export const placeSchema = z.object({
  name: z.string().trim().min(2, "Enter the place's name").max(60, "Use 60 characters or fewer"),
  district: z.string().refine((d) => DISTRICTS.includes(d), "Pick the district"),
  address: z.string().trim().max(120, "Use 120 characters or fewer"),
  mapUrl: z.string().trim().transform((s) => s || null).pipe(httpsUrl.nullable()),
  note: z.string().trim().max(200, "Use 200 characters or fewer"),
});

export const tableSchema = (now = Date.now()) =>
  z.object({
    bggId: z.number().int().positive("Pick a game"),
    placeId: z.string().max(64).nullable(),
    startsAt: z.number().refine((t) => t >= now - 5 * 60_000, "Pick a time that hasn't passed").refine((t) => t <= now + 180 * 86400_000, "Pick a date within 6 months"),
    seats: z.number().int().min(2, "A table needs at least 2 seats").max(12, "12 seats at most"),
    note: z.string().trim().max(200, "Use 200 characters or fewer"),
  });

/** Parses the datetime-local text of the table form (Jakarta time). */
export const parseStart = (s: string) => fromInputValue(s) ?? NaN;

const playerSchema = z
  .object({
    userId: z.string().max(64).optional(),
    guest: z.string().trim().min(1).max(30).optional(),
    winner: z.boolean(),
    score: z.number().int().min(-1_000_000).max(100_000_000).nullable(),
  })
  .refine((p) => Boolean(p.userId) !== Boolean(p.guest), "Each player is a member or a guest.");

export const playSchema = (now = Date.now()) =>
  z.object({
    bggId: z.number().int().positive("Pick a game"),
    playedOn: z.string().refine(isIsoDay, "Pick the date.").refine((d) => d <= todayWib(now), "A play can't be in the future.").refine((d) => d >= todayWib(now - 366 * 86400_000), "Plays older than a year can't be logged."),
    placeId: z.string().max(64).nullable(),
    durationMin: z.number().int().min(1).max(1440).nullable(),
    players: z.array(playerSchema).min(1, "Add at least one player.").max(12, "12 players at most."),
  });

export const reportSchema = z.object({
  targetType: z.enum(["member", "post", "comment", "table", "place", "play"]),
  targetId: z.string().min(1).max(64),
  reason: z.string().trim().min(5, "Say what is wrong, in a few words.").max(300, "Use 300 characters or fewer."),
});

/** Escapes % _ and \ so a search term is matched literally inside LIKE ... ESCAPE '\'. */
export const likePattern = (q: string) => `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`;
