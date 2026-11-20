import { describe, expect, it } from "vitest";
import { inParts } from "@/lib/.server/db";

describe("inParts", () => {
  it("never gives one query more than 90 values, and loses none", async () => {
    const sizes: number[] = [];
    const out = await inParts(Array.from({ length: 250 }, (_, i) => i), async (part) => { sizes.push(part.length); return part; });
    expect(sizes.every((n) => n <= 90)).toBe(true);
    expect(out).toHaveLength(250);
  });
  it("does nothing for an empty list", async () => {
    expect(await inParts([], async () => { throw new Error("must not run"); })).toEqual([]);
  });
});
