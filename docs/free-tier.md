# Cloudflare free plan: limits and ceilings

Limits checked in the official Cloudflare docs on 2026-11-20. Cloudflare can change them. Check the docs again before you rely on a number.

## What can cost money

Only R2 can cost money. Workers Free and D1 Free stop working at their limit. They never bill.

| Service | Free limit | What happens at the limit | Can it bill? |
|---|---|---|---|
| Workers | 100,000 requests a day. 10 ms CPU for each request. | Cloudflare returns error 1027 until 00:00 UTC (07:00 in Bekasi). | No |
| D1 | 5,000,000 rows read a day. 100,000 rows written a day. 500 MB for one database. 5 GB for the account. | Queries fail with a limit error until 00:00 UTC. At 500 MB, saving fails. | No |
| R2 storage | 10 GB a month | Cloudflare bills about US$0.015 for each extra GB a month. | **Yes** |
| R2 writes and lists (Class A) | 1,000,000 a month | Cloudflare bills US$4.50 for each extra million. | **Yes** |
| R2 reads (Class B) | 10,000,000 a month | Cloudflare bills US$0.36 for each extra million. | **Yes** |

R2 reads cannot pass their limit in practice. The Workers limit allows about 3,000,000 requests a month, and each picture view needs one read.

## Ceilings in the app

The code is in `app/lib/free-tier.ts` and `app/lib/.server/limits.ts`.

| Ceiling | Value | Why |
|---|---|---|
| Picture storage | 8 GB (80% of 10 GB) | The gap covers pictures that arrive while the stored total is up to an hour old. |
| Pictures for each member each day | 10 | One member cannot fill the storage fast. |
| Pictures for the whole site each day | 300 | This limits R2 writes and storage growth if many accounts misbehave. |
| Size of one picture | 2 MB (card photo), 3 MB (post picture) | This was already in place. |

When a ceiling stops an upload, the member sees a short message. The rest of the site keeps working. The day counters restart at 00:00 UTC.

To change the storage ceiling, set the secret `R2_CEILING_BYTES` on a site. Without it, the default is 8 GB.

## How the storage number works

1. The app lists the R2 bucket and adds up the sizes. The listing costs one R2 operation for each 1,000 files.
2. The app stores the total for one hour in the `setting` table (key `usage.r2`).
3. Each upload adds its size to the stored total at once.
4. The admin overview shows the total, the D1 size, and the pictures added today.

## What to watch

- **Admin overview, "Cloudflare free plan".** Check it each month. A red bar means 80% of a limit.
- **Cloudflare dashboard, Workers & Pages, the Worker, Metrics.** This shows requests for each day. The app cannot measure it.
- **Cloudflare dashboard, R2 Object Storage.** This shows storage and operations against the free amount.
- **Cloudflare dashboard, Notifications.** Add a billing or usage alert, if your account offers one. It sends an email before a bill grows. Cloudflare has no hard spending cap.

## If the site grows past the free plan

1. Workers Paid costs US$5 a month. It removes the daily request limit and the 10 ms CPU limit. D1 and R2 then bill by use above their included amounts.
2. A custom domain on Cloudflare adds rate limiting in front of the site. The workers.dev address does not offer it.
