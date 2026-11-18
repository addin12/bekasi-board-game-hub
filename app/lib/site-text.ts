import { z } from "zod";

// Text an admin can change from the back office. Stored in the `setting` table as site.<key>; plain text only,
// so nothing an admin types can inject markup into a page.

export const SITE_DEFAULTS = {
  homeTitle: "Find your next table in Bekasi",
  homeIntro: "Make a player card with the games you love, the ones you want to play, and the ones you're selling. The hub matches it with every other card in the community.",
  banner: "",
  contact: "Ask an admin in the community WhatsApp group",
  footer: "Run by and for the Bekasi board game community",
} as const;

export type SiteText = { -readonly [K in keyof typeof SITE_DEFAULTS]: string };
export const SITE_KEYS = Object.keys(SITE_DEFAULTS) as (keyof typeof SITE_DEFAULTS)[];
export const siteSettingKey = (k: keyof typeof SITE_DEFAULTS) => `site.${k}`;

/** The banner may be empty (no banner); every other field must have text. */
export const siteTextSchema = z.object({
  homeTitle: z.string().trim().min(3, "Enter a headline").max(80, "Use 80 characters or fewer"),
  homeIntro: z.string().trim().min(10, "Write a sentence or two").max(300, "Use 300 characters or fewer"),
  banner: z.string().trim().max(160, "Use 160 characters or fewer"),
  contact: z.string().trim().min(5, "Say how to reach the admins").max(200, "Use 200 characters or fewer"),
  footer: z.string().trim().min(3, "Enter the footer line").max(120, "Use 120 characters or fewer"),
});

/** Stored rows over the defaults. Unknown keys are ignored; a stored blank falls back, except for the banner. */
export function mergeSiteText(rows: { key: string; value: string }[]): SiteText {
  const out: SiteText = { ...SITE_DEFAULTS };
  for (const r of rows) {
    const k = SITE_KEYS.find((k) => siteSettingKey(k) === r.key);
    if (!k) continue;
    if (k === "banner" || r.value.trim()) out[k] = r.value;
  }
  return out;
}
