import { CEILING, FREE_TIER, formatBytes, percentOf } from "@/lib/free-tier";

// The texts the admins get when a free-plan number passes 80% or 95%. Plain text, short sentences.
export type Alert = { subject: string; text: string; bell: string };

export function r2Alert(level: "warn" | "stop", usedBytes: number, freeBytes: number, siteUrl: string): Alert {
  const pct = percentOf(usedBytes, freeBytes);
  const used = `${formatBytes(usedBytes)} of ${formatBytes(freeBytes)} (${pct}%)`;
  if (level === "stop") {
    return {
      subject: "Free plan: picture uploads are now off",
      bell: "Free plan: picture storage passed 95%. New pictures are off. Open Admin.",
      text: [
        `Picture storage is at ${used}.`,
        "",
        `New pictures are now off, because Cloudflare bills for R2 storage above ${formatBytes(FREE_TIER.r2Bytes)}. The rest of the site works as before.`,
        `Pictures that members already added stay visible. Uploads start again when storage falls below ${Math.round(CEILING.stopAt * 100)}%.`,
        "",
        "What to do:",
        `1. Open ${siteUrl}/admin and read the "Cloudflare free plan" panel.`,
        "2. Delete old posts that have a picture. Admin, Content, Posts.",
        "3. Or move the site to a paid Cloudflare plan.",
        "",
        "This message repeats once a week while storage stays above 95%.",
      ].join("\n"),
    };
  }
  return {
    subject: "Free plan notice: picture storage passed 80%",
    bell: "Free plan: picture storage passed 80%. Open Admin.",
    text: [
      `Picture storage is at ${used}.`,
      "",
      `Cloudflare bills for R2 storage above ${formatBytes(FREE_TIER.r2Bytes)}. At ${Math.round(CEILING.stopAt * 100)}% (${formatBytes(freeBytes * CEILING.stopAt)}) the site turns new pictures off by itself.`,
      "",
      "What to do:",
      `1. Open ${siteUrl}/admin and read the "Cloudflare free plan" panel.`,
      "2. Delete old posts that have a picture, or plan to move to a paid plan.",
      "",
      "This message repeats once a week while storage stays above 80%.",
    ].join("\n"),
  };
}

export function d1Alert(usedBytes: number, siteUrl: string): Alert {
  const limit = FREE_TIER.d1DatabaseBytes;
  return {
    subject: "Free plan notice: database size passed 80%",
    bell: "Free plan: database size passed 80%. Open Admin.",
    text: [
      `The database is at ${formatBytes(usedBytes)} of ${formatBytes(limit)} (${percentOf(usedBytes, limit)}%).`,
      "",
      `At ${formatBytes(limit)}, saving fails on the free plan. Cloudflare does not bill for this.`,
      "",
      "What to do:",
      `1. Open ${siteUrl}/admin and read the "Cloudflare free plan" panel.`,
      "2. Delete old content, or move the site to a paid plan.",
      "",
      "This message repeats once a week while the size stays above 80%.",
    ].join("\n"),
  };
}
