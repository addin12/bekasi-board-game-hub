export type FindMode = "like" | "play" | "trade";

export type MatchReason =
  | "shared_love" // both have it as favorite/hot
  | "owns_your_want" // they own a game you want to play
  | "wants_too" // you both want to play it
  | "wants_your_game" // they want to play a game you own
  | "sells_your_buy" // they sell a game you look for
  | "buys_your_sell" // they look for a game you sell
  | "loves" | "owns" | "wants" | "sells" | "buys"; // single-game search

/**
 * One row per game and reason. The SQL join multiplies rows when a game is both "favorite" and "hot"
 * on either card, which showed the same match twice in Find.
 */
export function uniqueMatches<T extends { bgg_id: number; reason: MatchReason }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.bgg_id}|${r.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const REASON_LABEL: Record<MatchReason, string> = {
  shared_love: "You both love it",
  owns_your_want: "Owns a game you want to play",
  wants_too: "Also wants to play it",
  wants_your_game: "Wants to play a game you own",
  sells_your_buy: "Sells a game you're looking for",
  buys_your_sell: "Looking for a game you sell",
  loves: "Loves it", owns: "Owns it", wants: "Wants to play it", sells: "Selling it", buys: "Looking to buy it",
};
