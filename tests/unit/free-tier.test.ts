import { describe, expect, it } from "vitest";
import { CEILING, FREE_TIER, GB, MB, alertDue, dayKey, decideUpload, formatBytes, levelFor, nearLimit, percentOf } from "@/lib/free-tier";
import { d1Alert, r2Alert } from "@/lib/limit-messages";

const STOP = FREE_TIER.r2Bytes * CEILING.stopAt; // 9.5 GB
const base = { usedBytes: 1 * GB, newBytes: 2 * MB, ceilingBytes: STOP, memberToday: 0, siteToday: 0 };
const DAY = 24 * 3600_000;

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
  it("stops when the new picture would pass 95% of the free storage, and not before", () => {
    expect(decideUpload({ ...base, usedBytes: STOP - 2 * MB }).ok).toBe(true); // lands exactly on the ceiling
    const r = decideUpload({ ...base, usedBytes: STOP - 2 * MB + 1 });
    expect(!r.ok && r.reason).toBe("storage");
  });
  it("checks the member limit first, so the message names the person's own limit", () => {
    const r = decideUpload({ ...base, memberToday: 99, siteToday: 999, usedBytes: 99 * GB });
    expect(!r.ok && r.reason).toBe("member");
  });
});

describe("levels", () => {
  it("is ok below 80%, warn from 80%, stop from 95%", () => {
    const f = FREE_TIER.r2Bytes;
    expect(levelFor(f * 0.79, f)).toBe("ok");
    expect(levelFor(f * 0.8, f)).toBe("warn");
    expect(levelFor(f * 0.949, f)).toBe("warn");
    expect(levelFor(f * 0.95, f)).toBe("stop");
    expect(levelFor(f * 2, f)).toBe("stop");
  });
  it("puts the warning below the stop, and the stop below the free limit", () => {
    expect(CEILING.warnAt).toBeLessThan(CEILING.stopAt);
    expect(CEILING.stopAt).toBeLessThan(1);
  });
});

describe("alertDue", () => {
  it("sends nothing while the level is ok", () => {
    expect(alertDue("ok", {}, 1_000_000)).toBeNull();
    expect(alertDue("ok", { warn: 0, stop: 0 }, 99 * DAY)).toBeNull();
  });
  it("sends the first message of a level at once", () => {
    expect(alertDue("warn", {}, 1000 * DAY)).toBe("warn");
    expect(alertDue("stop", {}, 1000 * DAY)).toBe("stop");
  });
  it("does not repeat a message inside one week", () => {
    const now = 1000 * DAY;
    expect(alertDue("warn", { warn: now - 6 * DAY }, now)).toBeNull();
    expect(alertDue("stop", { stop: now - 1000 }, now)).toBeNull();
  });
  it("repeats after one week while the level stays", () => {
    const now = 1000 * DAY;
    expect(alertDue("warn", { warn: now - 7 * DAY }, now)).toBe("warn");
  });
  it("sends the stop message even when the warning went out a minute ago", () => {
    const now = 1000 * DAY;
    expect(alertDue("stop", { warn: now - 60_000 }, now)).toBe("stop");
  });
});

describe("messages", () => {
  const url = "https://site.example";
  it("names the numbers and the admin page in the 80% message", () => {
    const a = r2Alert("warn", 8.2 * GB, FREE_TIER.r2Bytes, url);
    expect(a.subject).toContain("80%");
    expect(a.text).toContain("8.20 GB of 10.00 GB (82%)");
    expect(a.text).toContain("9.50 GB");
    expect(a.text).toContain(`${url}/admin`);
  });
  it("says that uploads are off in the 95% message", () => {
    const a = r2Alert("stop", 9.6 * GB, FREE_TIER.r2Bytes, url);
    expect(a.subject).toContain("uploads are now off");
    expect(a.text).toContain("9.60 GB of 10.00 GB (96%)");
    expect(a.bell.length).toBeLessThanOrEqual(200); // the bell text is cut at 200 characters
  });
  it("says that the database limit does not bill", () => {
    const a = d1Alert(420 * MB, url);
    expect(a.text).toContain("420.0 MB of 500.0 MB (84%)");
    expect(a.text).toContain("does not bill");
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
