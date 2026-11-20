import { describe, expect, it } from "vitest";
import { CEILING, FREE_TIER, GB, MB, dayKey, decideUpload, formatBytes, nearLimit, percentOf } from "@/lib/free-tier";

const base = { usedBytes: 1 * GB, newBytes: 2 * MB, ceilingBytes: CEILING.r2Bytes, memberToday: 0, siteToday: 0 };

describe("decideUpload", () => {
  it("allows a picture when every number is under its ceiling", () => {
    expect(decideUpload(base)).toEqual({ ok: true });
  });
  it("stops a member at the daily picture limit", () => {
    expect(decideUpload({ ...base, memberToday: CEILING.uploadsPerMemberPerDay - 1 }).ok).toBe(true);
    const r = decideUpload({ ...base, memberToday: CEILING.uploadsPerMemberPerDay });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("member");
  });
  it("stops the whole site at its daily picture limit", () => {
    const r = decideUpload({ ...base, siteToday: CEILING.uploadsPerSitePerDay });
    expect(!r.ok && r.reason).toBe("site");
  });
  it("stops when the new picture would pass the storage ceiling, and not before", () => {
    expect(decideUpload({ ...base, usedBytes: CEILING.r2Bytes - 2 * MB }).ok).toBe(true); // lands exactly on the ceiling
    const r = decideUpload({ ...base, usedBytes: CEILING.r2Bytes - 2 * MB + 1 });
    expect(!r.ok && r.reason).toBe("storage");
  });
  it("keeps the ceiling below the free limit", () => {
    expect(CEILING.r2Bytes).toBeLessThan(FREE_TIER.r2Bytes);
    expect(CEILING.r2Bytes / FREE_TIER.r2Bytes).toBe(0.8);
  });
  it("checks the member limit first, so the message names the person's own limit", () => {
    const r = decideUpload({ ...base, memberToday: 99, siteToday: 999, usedBytes: 99 * GB });
    expect(!r.ok && r.reason).toBe("member");
  });
});

describe("helpers", () => {
  it("names the UTC day", () => {
    expect(dayKey(new Date("2026-11-20T23:59:59Z"))).toBe("2026-11-20");
    expect(dayKey(new Date("2026-11-21T00:00:00Z"))).toBe("2026-11-21");
  });
  it("warns from 80 percent of a limit", () => {
    expect(nearLimit(79, 100)).toBe(false);
    expect(nearLimit(80, 100)).toBe(true);
  });
  it("caps a percentage at 100", () => {
    expect(percentOf(50, 100)).toBe(50);
    expect(percentOf(300, 100)).toBe(100);
  });
  it("formats sizes", () => {
    expect(formatBytes(512 * 1024)).toBe("512 KB");
    expect(formatBytes(5 * MB)).toBe("5.0 MB");
    expect(formatBytes(8 * GB)).toBe("8.00 GB");
  });
});
