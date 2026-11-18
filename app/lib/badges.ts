// Badges come from what members actually did, never from posting a lot. They are computed from counts on every
// card view, so there is nothing to keep in sync. Thresholds are small because the community is.

export type BadgeStats = { plays: number; games: number; places: number; hosted: number; sold: number };

export const BADGES = [
  { code: "first_roll", name: "First Roll", rule: "Logged a first play", test: (s: BadgeStats) => s.plays >= 1 },
  { code: "regular", name: "Regular", rule: "10 confirmed plays", test: (s: BadgeStats) => s.plays >= 10 },
  { code: "host", name: "Host", rule: "Hosted 3 tables that happened", test: (s: BadgeStats) => s.hosted >= 3 },
  { code: "explorer", name: "Explorer", rule: "Played at 3 different places", test: (s: BadgeStats) => s.places >= 3 },
  { code: "wide_shelf", name: "Wide Shelf", rule: "Played 15 different games", test: (s: BadgeStats) => s.games >= 15 },
  { code: "trader", name: "Trader", rule: "Sold 3 games through the hub", test: (s: BadgeStats) => s.sold >= 3 },
] as const;

export const earnedBadges = (s: BadgeStats) => BADGES.filter((b) => b.test(s));
