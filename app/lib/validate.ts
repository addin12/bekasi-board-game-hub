import { z } from "zod";
import { DISTRICTS } from "./districts";

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
// Handles that would clash with routes or impersonate staff.
const RESERVED = new Set(["admin", "api", "find", "settings", "sign_in", "me", "g", "p", "img", "moderator", "staff"]);

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(40, "Use 40 characters or fewer."),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE_RE, "Use 3–20 lowercase letters, numbers or _.")
    .refine((h) => !RESERVED.has(h), "That username is reserved. Pick another."),
  district: z.string().refine((d) => DISTRICTS.includes(d), "Pick your district from the list."),
  bggUsername: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9_ .-]*$/, "BGG usernames use letters, numbers, spaces, _ . or -.")
    .transform((s) => s || null),
  bio: z.string().trim().max(280, "Keep it to 280 characters."),
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
