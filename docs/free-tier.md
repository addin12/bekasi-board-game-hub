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

## Rules in the app

The code is in `app/lib/free-tier.ts`, `app/lib/limit-messages.ts`, and `app/lib/.server/limits.ts`.

| Level | R2 storage (of 10 GB) | What happens |
|---|---|---|
| OK | below 80% (8 GB) | Nothing. |
| Warning | from 80% (8 GB) | The admins get an email, a bell message, and a phone notification. The admin page turns red. Uploads continue. |
| Stop | from 95% (9.5 GB) | The admins get a second message. **New pictures are off.** The rest of the site works. Pictures that exist stay visible. |

Uploads start again when storage falls below 95%. Delete posts that have a picture to free space.

The database (D1) gets the 80% message only. At its limit, Cloudflare refuses writes and does not bill. So it needs no stop.

A message repeats once a week while a level stays. A message for a higher level goes out at once.

### Why we stop pictures and not the whole site

Cloudflare bills R2 for the data that sits in it, whether the site runs or not. Turning the whole site off does not lower the bill. Only fewer stored bytes lower it. New pictures are the only thing that adds bytes. Reads of pictures are free in practice (see above). So the stop turns off the one thing that can start a bill and keeps the site useful.

### More limits for each day

| Ceiling | Value |
|---|---|
| Pictures for each member each day | 10 |
| Pictures for the whole site each day | 300 |
| Size of one picture | 2 MB (card photo), 3 MB (post picture) |

The day counters restart at 00:00 UTC.

### When the check runs

1. After each picture upload.
2. When an admin opens the overview.
3. Every 6 hours, on the real site only. This is a Cron Trigger in `wrangler.jsonc`. It lists the bucket about once a day, so it costs about 30 R2 operations a month.

The overview shows the time of the last check and what happened to the last email.

### The email

The email goes to every address in the secret `ADMIN_EMAILS`. It needs the Gmail secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`). Without them, the admins still get the bell message and the phone notification, and the overview says "not sent: email is not set up".

To change the free amount that the percentages use, set the secret `R2_FREE_BYTES`. The default is 10 GB.

## How the storage number works

1. The app lists the R2 bucket and adds up the sizes. The listing costs one R2 operation for each 1,000 files.
2. The app stores the total in the `setting` table (key `usage.r2`). It lists the bucket again only when the stored total is one day old.
3. Each upload adds its size to the stored total at once. The app does not subtract deleted pictures until the next list, so the total can read a little high. That is the safe side.
4. The admin overview shows the total, the D1 size, and the pictures added today.

## What to watch

- **Admin overview, "Cloudflare free plan".** Check it each month. A red bar means 80% of a limit.
- **Cloudflare dashboard, Workers & Pages, the Worker, Metrics.** This shows requests for each day. The app cannot measure it.
- **Cloudflare dashboard, R2 Object Storage.** This shows storage and operations against the free amount.
- **Cloudflare dashboard, Notifications.** Add a billing or usage alert, if your account offers one. It sends an email before a bill grows. Cloudflare has no hard spending cap.

## If the site grows past the free plan

1. Workers Paid costs US$5 a month. It lifts the daily request limit and the 10 ms CPU limit. D1 and R2 then bill by use above their included amounts.
2. A custom domain on Cloudflare adds rate limiting in front of the site. The workers.dev address does not offer it.
