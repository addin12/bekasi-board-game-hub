import { describe, expect, it } from "vitest";
import { earnedBadges } from "@/lib/badges";
import { formatDay, formatStamp, formatWhen, fromInputValue, isIsoDay, todayWib, toInputValue } from "@/lib/dates";
import { likePattern, placeSchema, playSchema, reportSchema, tableSchema } from "@/lib/validate";

// 2026-11-21 18:00 Jakarta = 11:00 UTC
const SAT_1800 = Date.UTC(2026, 10, 21, 11, 0);

describe("Jakarta dates", () => {
  it("formats in WIB whatever the machine's zone", () => {
    expect(formatWhen(SAT_1800)).toBe("Sat 21 Nov, 18:00");
    expect(formatStamp(SAT_1800)).toBe("21 Nov, 18:00");
    expect(formatDay("2026-11-21")).toBe("21 Nov 2026");
  });
  it("rolls the date over at 17:00 UTC (midnight WIB)", () => {
    expect(todayWib(Date.UTC(2026, 10, 21, 16, 59))).toBe("2026-11-21");
    expect(todayWib(Date.UTC(2026, 10, 21, 17, 0))).toBe("2026-11-22");
  });
  it("round-trips datetime-local values and rejects impossible ones", () => {
    expect(fromInputValue("2026-11-21T18:00")).toBe(SAT_1800);
    expect(toInputValue(SAT_1800)).toBe("2026-11-21T18:00");
    expect(fromInputValue("2026-02-31T10:00")).toBeNull();
    expect(fromInputValue("2026-11-21T25:00")).toBeNull();
    expect(fromInputValue("21/11/2026 18:00")).toBeNull();
  });
  it("accepts only real calendar days", () => {
    expect(isIsoDay("2026-11-21")).toBe(true);
    expect(isIsoDay("2026-02-30")).toBe(false);
    expect(isIsoDay("2026-1-1")).toBe(false);
  });
});

describe("badges", () => {
  const none = { plays: 0, games: 0, places: 0, hosted: 0, sold: 0 };
  it("starts empty and earns each badge at its threshold", () => {
    expect(earnedBadges(none)).toEqual([]);
    expect(earnedBadges({ ...none, plays: 1 }).map((b) => b.code)).toEqual(["first_roll"]);
    expect(earnedBadges({ ...none, plays: 10 }).map((b) => b.code)).toEqual(["first_roll", "regular"]);
    expect(earnedBadges({ ...none, hosted: 3, places: 3, games: 15, sold: 3 }).map((b) => b.code)).toEqual(["host", "explorer", "wide_shelf", "trader"]);
  });
});

describe("play, table, place and report input", () => {
  const now = SAT_1800;
  const play = { bggId: 13, playedOn: "2026-11-21", placeId: null, durationMin: 60, players: [{ userId: "u1", winner: true, score: 10 }, { guest: "Budi", winner: false, score: null }] };
  it("accepts a valid play", () => expect(playSchema(now).safeParse(play).success).toBe(true));
  it("rejects future, ancient and impossible dates", () => {
    expect(playSchema(now).safeParse({ ...play, playedOn: "2026-11-23" }).success).toBe(false);
    expect(playSchema(now).safeParse({ ...play, playedOn: "2025-01-01" }).success).toBe(false);
    expect(playSchema(now).safeParse({ ...play, playedOn: "2026-02-31" }).success).toBe(false);
  });
  it("needs 1 to 12 players, each a member xor a guest", () => {
    expect(playSchema(now).safeParse({ ...play, players: [] }).success).toBe(false);
    expect(playSchema(now).safeParse({ ...play, players: Array.from({ length: 13 }, (_, i) => ({ guest: `g${i}`, winner: false, score: null })) }).success).toBe(false);
    expect(playSchema(now).safeParse({ ...play, players: [{ userId: "u1", guest: "x", winner: false, score: null }] }).success).toBe(false);
    expect(playSchema(now).safeParse({ ...play, players: [{ winner: false, score: null }] }).success).toBe(false);
  });
  const table = { bggId: 13, placeId: null, startsAt: now + 86400_000, seats: 4, note: "" };
  it("accepts a table in the next 6 months with 2 to 12 seats", () => {
    expect(tableSchema(now).safeParse(table).success).toBe(true);
    expect(tableSchema(now).safeParse({ ...table, startsAt: now - 3600_000 }).success).toBe(false);
    expect(tableSchema(now).safeParse({ ...table, startsAt: now + 200 * 86400_000 }).success).toBe(false);
    expect(tableSchema(now).safeParse({ ...table, seats: 1 }).success).toBe(false);
    expect(tableSchema(now).safeParse({ ...table, seats: 13 }).success).toBe(false);
  });
  it("only allows https map links", () => {
    const place = { name: "Cafe", district: "Bekasi Barat", address: "", mapUrl: "https://maps.app.goo.gl/abc", note: "" };
    expect(placeSchema.safeParse(place).success).toBe(true);
    expect(placeSchema.safeParse({ ...place, mapUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(placeSchema.safeParse({ ...place, mapUrl: "http://example.com" }).success).toBe(false);
    expect(placeSchema.safeParse({ ...place, mapUrl: "" }).data?.mapUrl).toBeNull();
    expect(placeSchema.safeParse({ ...place, district: "Jakarta" }).success).toBe(false);
  });
  it("needs a reason for a report", () => {
    expect(reportSchema.safeParse({ targetType: "post", targetId: "p1", reason: "spam" }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "post", targetId: "p1", reason: "Selling something fake" }).success).toBe(true);
    expect(reportSchema.safeParse({ targetType: "user", targetId: "p1", reason: "Selling something fake" }).success).toBe(false);
  });
  it("escapes LIKE wildcards in search terms", () => {
    expect(likePattern("100%_a\\b")).toBe("%100\\%\\_a\\\\b%");
  });
});

import { mergeSiteText, siteTextSchema, SITE_DEFAULTS } from "@/lib/site-text";

describe("editable site text", () => {
  const ok = { homeTitle: "Find your table", homeIntro: "A short intro for the home page.", banner: "", contact: "Ask in the group", footer: "By the community" };
  it("falls back to the defaults and lets the banner be empty", () => {
    expect(mergeSiteText([])).toEqual(SITE_DEFAULTS);
    expect(mergeSiteText([{ key: "site.homeTitle", value: "  " }]).homeTitle).toBe(SITE_DEFAULTS.homeTitle);
    expect(mergeSiteText([{ key: "site.banner", value: "Playday Saturday" }]).banner).toBe("Playday Saturday");
    expect(mergeSiteText([{ key: "other.key", value: "x" }])).toEqual(SITE_DEFAULTS);
  });
  it("validates lengths and requires the core fields", () => {
    expect(siteTextSchema.safeParse(ok).success).toBe(true);
    expect(siteTextSchema.safeParse({ ...ok, homeTitle: "ab" }).success).toBe(false);
    expect(siteTextSchema.safeParse({ ...ok, contact: "" }).success).toBe(false);
    expect(siteTextSchema.safeParse({ ...ok, banner: "x".repeat(161) }).success).toBe(false);
  });
});
