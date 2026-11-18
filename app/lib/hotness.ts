// Hotness = up to 3 games a member loved playing lately.
// Logged sessions win once there are enough; otherwise the member's BGG plays; otherwise BGG's global hot list.

export const HOT_SIZE = 3;
export const MIN_SESSIONS = 3;

export type HotSource = "sessions" | "bgg_plays" | "bgg_hot";

/** Most-played games first; ties go to the most recent play. */
export function topPlayed(plays: { bggId: number; date: string; quantity?: number }[], size = HOT_SIZE): number[] {
  const tally = new Map<number, { count: number; last: string }>();
  for (const p of plays) {
    const t = tally.get(p.bggId) ?? { count: 0, last: "" };
    t.count += p.quantity ?? 1;
    if (p.date > t.last) t.last = p.date;
    tally.set(p.bggId, t);
  }
  return [...tally.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].last.localeCompare(a[1].last))
    .slice(0, size)
    .map(([id]) => id);
}

export function chooseHot(input: {
  sessionPlays: { bggId: number; date: string }[];
  bggPlays: { bggId: number; date: string; quantity?: number }[] | null;
  bggHot: number[];
}): { source: HotSource; ids: number[] } {
  if (input.sessionPlays.length >= MIN_SESSIONS) return { source: "sessions", ids: topPlayed(input.sessionPlays) };
  if (input.bggPlays && input.bggPlays.length > 0) return { source: "bgg_plays", ids: topPlayed(input.bggPlays) };
  return { source: "bgg_hot", ids: input.bggHot.slice(0, HOT_SIZE) };
}

export const HOT_SOURCE_LABEL: Record<HotSource, string> = {
  sessions: "From sessions logged here",
  bgg_plays: "From recent BGG plays",
  bgg_hot: "Hot on BGG right now",
};
