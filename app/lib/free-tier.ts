// The Cloudflare free-plan limits this site lives under, and the ceilings we set below them.
// Only R2 can lead to a bill: past its free amount, R2 charges. Workers Free and D1 Free stop working at their limit and never bill.
// So the app guards R2 itself and only shows the other numbers. Limits checked in Cloudflare's own docs on 2026-11-20.
export const MB = 1024 ** 2;
export const GB = 1024 ** 3;

export const FREE_TIER = {
  r2Bytes: 10 * GB, // R2 storage per month
  r2ClassAPerMonth: 1_000_000, // writes and lists
  r2ClassBPerMonth: 10_000_000, // reads
  d1DatabaseBytes: 500 * MB, // one D1 database on the free plan (5 GB for the whole account)
  d1RowsReadPerDay: 5_000_000,
  d1RowsWrittenPerDay: 100_000,
  workersRequestsPerDay: 100_000, // resets at 00:00 UTC
  workersCpuMs: 10,
} as const;

export const CEILING = {
  /** Share of a free limit where the admins get an email and the admin page turns red. */
  warnAt: 0.8,
  /** Share of the free R2 storage where new pictures stop. The 5% gap covers pictures that arrive while a total is old. */
  stopAt: 0.95,
  /** How often a reminder repeats while a number stays above a threshold. */
  repeatEveryMs: 7 * 24 * 3600_000,
  uploadsPerMemberPerDay: 10,
  uploadsPerSitePerDay: 300,
} as const;

/** The UTC day, as in "2026-11-20". Cloudflare's daily limits reset at 00:00 UTC. */
export const dayKey = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

export const percentOf = (used: number, limit: number): number => Math.min(100, Math.round((used / limit) * 100));
export const nearLimit = (used: number, limit: number): boolean => used >= limit * CEILING.warnAt;

export type Level = "ok" | "warn" | "stop";
/** ok below 80%, warn from 80%, stop from 95% of a limit. */
export const levelFor = (used: number, limit: number): Level => (used >= limit * CEILING.stopAt ? "stop" : used >= limit * CEILING.warnAt ? "warn" : "ok");

/**
 * Which message the admins get now, or null for none. `sent` holds the time of the last message of each kind.
 * A message goes out when a level is reached for the first time, and again after one week while the level stays.
 */
export function alertDue(level: Level, sent: { warn?: number; stop?: number }, now: number): "warn" | "stop" | null {
  if (level === "ok") return null;
  return now - (sent[level] ?? 0) >= CEILING.repeatEveryMs ? level : null;
}

export type UploadDecision = { ok: true } | { ok: false; reason: "member" | "site" | "storage"; message: string };

/** Whether one more picture may be stored. The checks run from the most specific to the most general. */
export function decideUpload(a: { usedBytes: number; newBytes: number; ceilingBytes: number; memberToday: number; siteToday: number }): UploadDecision {
  if (a.memberToday >= CEILING.uploadsPerMemberPerDay) return { ok: false, reason: "member", message: "You reached today's picture limit. Try again tomorrow." };
  if (a.siteToday >= CEILING.uploadsPerSitePerDay) return { ok: false, reason: "site", message: "Picture uploads are paused for today. Try again tomorrow." };
  if (a.usedBytes + a.newBytes > a.ceilingBytes) return { ok: false, reason: "storage", message: "Picture uploads are paused because the site storage is full. Tell an admin." };
  return { ok: true };
}

export const formatBytes = (n: number): string => (n >= GB ? `${(n / GB).toFixed(2)} GB` : n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
