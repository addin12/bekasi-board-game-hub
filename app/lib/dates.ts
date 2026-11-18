// Everything on the site is shown in Jakarta time (WIB, UTC+7, no daylight saving).
// Hand-written on purpose: Intl formatting differs between server and browsers and caused hydration errors on another project.

const WIB_MS = 7 * 3600_000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");

function wib(ms: number) {
  const d = new Date(ms + WIB_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), dow: d.getUTCDay() };
}

/** "Sat 21 Nov, 18:00" */
export function formatWhen(ms: number): string {
  const t = wib(ms);
  return `${DAYS[t.dow]} ${t.d} ${MONTHS[t.m]}, ${p2(t.h)}:${p2(t.min)}`;
}

/** "21 Nov, 18:00": for feed items and comments. */
export function formatStamp(ms: number): string {
  const t = wib(ms);
  return `${t.d} ${MONTHS[t.m]}, ${p2(t.h)}:${p2(t.min)}`;
}

/** "2026-11-21" -> "21 Nov 2026" */
export function formatDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/** Today's Jakarta date as YYYY-MM-DD. */
export function todayWib(nowMs = Date.now()): string {
  const t = wib(nowMs);
  return `${t.y}-${p2(t.m + 1)}-${p2(t.d)}`;
}

/** Value for <input type="datetime-local"> in Jakarta time. */
export function toInputValue(ms: number): string {
  const t = wib(ms);
  return `${t.y}-${p2(t.m + 1)}-${p2(t.d)}T${p2(t.h)}:${p2(t.min)}`;
}

/** Parses a datetime-local value as Jakarta time. Null when malformed or not a real date. */
export function fromInputValue(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, mi) - WIB_MS;
  return toInputValue(ms) === s ? ms : null; // round trip rejects 31 Feb, 25:00 and the like
}

/** True for a real calendar day written as YYYY-MM-DD (rejects 2026-02-31). */
export function isIsoDay(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
