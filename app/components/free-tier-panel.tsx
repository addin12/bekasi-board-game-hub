import { CEILING, FREE_TIER, formatBytes, nearLimit, percentOf } from "@/lib/free-tier";

type Usage = { r2: { bytes: number; objects: number; at: number; truncated: boolean }; d1Bytes: number; ceilingBytes: number; uploadsToday: number };

function Bar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const near = nearLimit(used, limit);
  return (
    <div role="img" aria-label={`${label}: ${percentOf(used, limit)} percent of the free limit`} className="h-3 overflow-hidden rounded-full bg-muted">
      <div className={near ? "h-full bg-destructive" : "h-full bg-ink"} style={{ width: `${Math.max(2, percentOf(used, limit))}%` }} />
    </div>
  );
}

function Row({ title, value, bar, note }: { title: string; value: string; bar?: React.ReactNode; note: string }) {
  return (
    <div className="grid gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="font-extrabold">{title}</h3>
        <p className="font-semibold tabular-nums">{value}</p>
      </div>
      {bar}
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

/** The free-plan numbers the site can measure by itself. The per-day numbers live in the Cloudflare dashboard. */
export function FreeTierPanel({ usage }: { usage: Usage }) {
  const { r2, d1Bytes, ceilingBytes, uploadsToday } = usage;
  const r2Near = nearLimit(r2.bytes, FREE_TIER.r2Bytes);
  const d1Near = nearLimit(d1Bytes, FREE_TIER.d1DatabaseBytes);
  return (
    <section aria-labelledby="free-tier" className="panel grid gap-4 p-5">
      <div className="grid gap-1">
        <h2 id="free-tier" className="text-xl font-extrabold">Cloudflare free plan</h2>
        <p className="text-muted-foreground">Cloudflare charges money only if picture storage goes past its free amount. Uploads stop at {formatBytes(ceilingBytes)} to keep a margin.</p>
      </div>
      <div className="grid divide-y divide-line">
        <Row
          title="Picture storage (R2)"
          value={`${formatBytes(r2.bytes)} of ${formatBytes(FREE_TIER.r2Bytes)}`}
          bar={<Bar used={r2.bytes} limit={FREE_TIER.r2Bytes} label="Picture storage" />}
          note={`${r2.objects}${r2.truncated ? "+" : ""} files. ${r2Near ? "Near the limit: delete old pictures or ask for a paid plan. " : ""}This number updates at most once an hour.`}
        />
        <Row
          title="Database size (D1)"
          value={`${formatBytes(d1Bytes)} of ${formatBytes(FREE_TIER.d1DatabaseBytes)}`}
          bar={<Bar used={d1Bytes} limit={FREE_TIER.d1DatabaseBytes} label="Database size" />}
          note={d1Near ? "Near the limit. At the limit, saving fails. Cloudflare does not bill for this on the free plan." : "At the limit, saving fails. Cloudflare does not bill for this on the free plan."}
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
    </section>
  );
}
