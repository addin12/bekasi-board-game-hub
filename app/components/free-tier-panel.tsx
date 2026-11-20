import { CEILING, FREE_TIER, formatBytes, percentOf, type Level } from "@/lib/free-tier";
import { formatStamp } from "@/lib/dates";

type Usage = {
  r2: { bytes: number; objects: number; truncated: boolean };
  d1Bytes: number;
  r2Level: Level;
  d1Level: Level;
  freeBytes: number;
  stopBytes: number;
  uploadsToday: number;
  checkedAt: number;
  mail: string;
  mailFailure: { at: number; error: string } | null;
};

function Bar({ used, limit, level, label }: { used: number; limit: number; level: Level; label: string }) {
  return (
    <div role="img" aria-label={`${label}: ${percentOf(used, limit)} percent of the free limit`} className="h-3 overflow-hidden rounded-full bg-muted">
      <div className={level === "ok" ? "h-full bg-ink" : "h-full bg-destructive"} style={{ width: `${Math.max(2, percentOf(used, limit))}%` }} />
    </div>
  );
}

function Row({ title, value, bar, note, status }: { title: string; value: string; bar?: React.ReactNode; note: string; status?: string }) {
  return (
    <div className="grid gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="font-extrabold">{title}</h3>
        <p className="font-semibold tabular-nums">{value}</p>
      </div>
      {bar}
      {status && <p role="status" className="font-bold text-destructive">{status}</p>}
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

const R2_STATUS: Record<Level, string | undefined> = {
  ok: undefined,
  warn: "Above 80%. The admins got a notice.",
  stop: "Above 95%. New pictures are OFF until storage falls.",
};

/** The free-plan numbers the site measures by itself. The per-day numbers live in the Cloudflare dashboard. */
export function FreeTierPanel({ usage }: { usage: Usage }) {
  const { r2, d1Bytes, freeBytes, stopBytes, uploadsToday } = usage;
  return (
    <section aria-labelledby="free-tier" className="panel grid gap-4 p-5">
      <div className="grid gap-1">
        <h2 id="free-tier" className="text-xl font-extrabold">Cloudflare free plan</h2>
        <p className="text-muted-foreground">
          Cloudflare charges money only if picture storage goes past {formatBytes(FREE_TIER.r2Bytes)}. The admins get a notice at 80%. New pictures stop at 95%, so no bill can start.
        </p>
      </div>
      <div className="grid divide-y divide-line">
        <Row
          title="Picture storage (R2)"
          value={`${formatBytes(r2.bytes)} of ${formatBytes(freeBytes)} (${percentOf(r2.bytes, freeBytes)}%)`}
          bar={<Bar used={r2.bytes} limit={freeBytes} level={usage.r2Level} label="Picture storage" />}
          status={R2_STATUS[usage.r2Level]}
          note={`${r2.objects}${r2.truncated ? "+" : ""} files. Notice at ${formatBytes(freeBytes * CEILING.warnAt)}. New pictures stop at ${formatBytes(stopBytes)}.`}
        />
        <Row
          title="Database size (D1)"
          value={`${formatBytes(d1Bytes)} of ${formatBytes(FREE_TIER.d1DatabaseBytes)} (${percentOf(d1Bytes, FREE_TIER.d1DatabaseBytes)}%)`}
          bar={<Bar used={d1Bytes} limit={FREE_TIER.d1DatabaseBytes} level={usage.d1Level} label="Database size" />}
          status={usage.d1Level === "ok" ? undefined : "Above 80%. The admins got a notice."}
          note="At the limit, saving fails. Cloudflare does not bill for this on the free plan."
        />
        <Row
          title="Pictures added today"
          value={`${uploadsToday} of ${CEILING.uploadsPerSitePerDay}`}
          note={`Each member may add ${CEILING.uploadsPerMemberPerDay} a day. The count restarts at 00:00 UTC, which is 07:00 in Bekasi.`}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Cloudflare also limits each day: {FREE_TIER.workersRequestsPerDay.toLocaleString("en-US")} site requests, {FREE_TIER.d1RowsReadPerDay.toLocaleString("en-US")} database rows read, and {FREE_TIER.d1RowsWrittenPerDay.toLocaleString("en-US")} rows written. When the site passes one, it shows errors until 00:00 UTC. It does not cost money. See these numbers in the Cloudflare dashboard under Workers &amp; Pages.
      </p>
      <p className="text-sm text-muted-foreground tabular-nums">
        Last check: {formatStamp(usage.checkedAt)}. Last email: {usage.mail}.
      </p>
      {usage.mailFailure && (
        <p role="status" className="text-sm font-bold text-destructive">
          Last failed sign-in email: {formatStamp(usage.mailFailure.at)}. {usage.mailFailure.error}. Check the Gmail app password.
        </p>
      )}
    </section>
  );
}
