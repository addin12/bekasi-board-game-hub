import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth-client";
import { parseCollection, parseHot, parsePlays, parseSearch, parseThings } from "@/lib/bgg-parse";
import { chooseHot, topPlayed } from "@/lib/hotness";
import { constantTimeEqual, hashPasscode } from "@/lib/passcode";
import { uniqueMatches } from "@/lib/find";
import { isSandboxEmail, isSandboxOn } from "@/lib/sandbox";
import { parseRupiah, profileSchema } from "@/lib/validate";

const thingXml = `<?xml version="1.0"?><items><item type="boardgame" id="13">
  <thumbnail>https://img/t.png</thumbnail><image>https://img/i.png</image>
  <name type="primary" sortindex="1" value="CATAN"/><name type="alternate" sortindex="1" value="Catan Alt"/>
  <yearpublished value="1995"/><minplayers value="3"/><maxplayers value="4"/><playingtime value="120"/>
  <statistics page="1"><ratings><averageweight value="2.2954"/></ratings></statistics>
</item></items>`;

describe("BGG parsers", () => {
  it("reads a thing with primary name, counts and weight", () => {
    expect(parseThings(thingXml)).toEqual([
      { bggId: 13, name: "CATAN", year: 1995, thumbnail: "https://img/t.png", image: "https://img/i.png", minPlayers: 3, maxPlayers: 4, playingTime: 120, weight: 2.2954 },
    ]);
  });
  it("reads a single search hit (not wrapped in an array by BGG)", () => {
    expect(parseSearch(`<items total="1"><item type="boardgame" id="5"><name type="primary" value="Acquire"/><yearpublished value="1964"/></item></items>`))
      .toEqual([{ bggId: 5, name: "Acquire", year: 1964 }]);
  });
  it("returns empty lists for empty answers", () => {
    expect(parseSearch(`<items total="0"></items>`)).toEqual([]);
    expect(parsePlays(`<plays username="x" total="0"></plays>`)).toEqual([]);
  });
  it("reads hot ids in rank order", () => {
    expect(parseHot(`<items><item id="9" rank="1"/><item id="3" rank="2"/></items>`)).toEqual([9, 3]);
  });
  it("reads plays with quantity", () => {
    expect(parsePlays(`<plays><play date="2026-11-01" quantity="2"><item name="Harmonies" objecttype="thing" objectid="414317"/></play></plays>`))
      .toEqual([{ bggId: 414317, name: "Harmonies", date: "2026-11-01", quantity: 2 }]);
  });
  it("reads a collection, dropping duplicates", () => {
    const xml = `<items><item objecttype="thing" objectid="13"><name sortindex="1">CATAN</name><yearpublished>1995</yearpublished><thumbnail>t</thumbnail></item>
      <item objecttype="thing" objectid="13"><name sortindex="1">CATAN</name></item></items>`;
    const out = parseCollection(xml);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ bggId: 13, name: "CATAN", year: 1995, thumbnail: "t" });
  });
});

describe("hotness", () => {
  it("ranks by play count, then most recent", () => {
    const plays = [
      { bggId: 1, date: "2026-10-01" }, { bggId: 1, date: "2026-10-02" },
      { bggId: 2, date: "2026-11-01" }, { bggId: 3, date: "2026-09-01" }, { bggId: 4, date: "2026-08-01", quantity: 3 },
    ];
    expect(topPlayed(plays)).toEqual([4, 1, 2]);
  });
  it("uses sessions once there are enough, else BGG plays, else BGG hot", () => {
    const s = [{ bggId: 7, date: "2026-11-01" }];
    expect(chooseHot({ sessionPlays: [...s, ...s, ...s], bggPlays: [{ bggId: 1, date: "x" }], bggHot: [9] })).toEqual({ source: "sessions", ids: [7] });
    expect(chooseHot({ sessionPlays: s, bggPlays: [{ bggId: 1, date: "x" }], bggHot: [9] })).toEqual({ source: "bgg_plays", ids: [1] });
    expect(chooseHot({ sessionPlays: [], bggPlays: [], bggHot: [9, 8, 7, 6] })).toEqual({ source: "bgg_hot", ids: [9, 8, 7] });
  });
});

describe("member passcode", () => {
  it("hashes case- and space-insensitively and compares exactly", async () => {
    const a = await hashPasscode("secret", " Meeple42 ");
    const b = await hashPasscode("secret", "meeple42");
    expect(constantTimeEqual(a, b)).toBe(true);
    expect(constantTimeEqual(a, await hashPasscode("secret", "meeple43"))).toBe(false);
    expect(constantTimeEqual(a, await hashPasscode("other-secret", "meeple42"))).toBe(false);
  });
});

describe("Find matches", () => {
  it("shows a game once per reason even when it is both favorite and hot", () => {
    const rows = [
      { bgg_id: 7, reason: "shared_love" as const }, { bgg_id: 7, reason: "shared_love" as const },
      { bgg_id: 7, reason: "owns_your_want" as const }, { bgg_id: 9, reason: "shared_love" as const },
    ];
    expect(uniqueMatches(rows)).toEqual([rows[0], rows[2], rows[3]]);
  });
});

describe("sandbox sign-in", () => {
  it("only applies on the sandbox, only to @sandbox.test", () => {
    expect(isSandboxEmail("Tester@Sandbox.test ", isSandboxOn("1"))).toBe(true);
    expect(isSandboxEmail("tester@sandbox.test", isSandboxOn("0"))).toBe(false); // real site
    expect(isSandboxEmail("tester@sandbox.test", isSandboxOn(undefined))).toBe(false);
    expect(isSandboxEmail("member@gmail.com", isSandboxOn("1"))).toBe(false);
    expect(isSandboxEmail("x@sandbox.test.evil.com", isSandboxOn("1"))).toBe(false);
  });
});

describe("validation", () => {
  it.each([["350000", 350000], ["350.000", 350000], ["Rp 350k", 350000], ["", null], ["abc", null], ["0", null], ["999999999999", null]])(
    "parseRupiah(%j) = %j", (raw, out) => expect(parseRupiah(raw as string)).toBe(out),
  );
  const ok = { displayName: "Malik", handle: "BigMag173", district: "Bekasi Timur", bggUsername: "", bio: "" };
  it("accepts a valid card and lowercases the handle", () => {
    const r = profileSchema.parse(ok);
    expect(r.handle).toBe("bigmag173");
    expect(r.bggUsername).toBeNull();
  });
  it("rejects unknown districts, reserved and malformed handles", () => {
    expect(profileSchema.safeParse({ ...ok, district: "Jakarta" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, handle: "admin" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...ok, handle: "a-b" }).success).toBe(false);
  });
  it("only allows same-site redirects after sign-in", () => {
    expect(safeNext("/find?mode=play")).toBe("/find?mode=play");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
