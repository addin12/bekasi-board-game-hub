# Runbook: backup and restore

This runbook answers audit finding M1. A backup is not a backup until a restore works. I tested both ways of restoring on 2026-11-20 (see the drill log).

## What we protect, and how

| Data | Where it lives | Protection |
|---|---|---|
| Database (members, cards, posts, plays, tables, settings) | Cloudflare D1 | 1. D1 Time Travel: any moment of the last 7 days, same account. 2. A weekly dump on this PC. |
| Pictures (card photos, post pictures) | Cloudflare R2 | A weekly copy on this PC. The keys come from the database. |
| Code | `D:\TTRPG\Board Game Hub` | The GitHub repository (see `docs/secrets.md`). The old history is in a private repository. |
| Secrets | Cloudflare Worker secrets | Not backed up by this runbook. See `docs/secrets.md`. |

The dump and the pictures hold personal data (emails, photos). Git ignores the folder `backups/`. Never put it in a public place.

## The weekly backup

- A Windows task named **BekasiHub weekly backup** runs `npm run backup` every Sunday at 10:00. If the PC is off, it runs at the next start.
- It saves the real site to `backups/production/<date>/db.sql` and `backups/production/pictures/`. The log is `backups/backup.log`.
- It keeps the newest 8 dumps. It saves each picture once, so that folder grows with the site.
- To run it by hand: `npm run backup`. For the sandbox: `npm run backup -- --env staging`.
- To delete the schedule: `Unregister-ScheduledTask -TaskName 'BekasiHub weekly backup' -Confirm:$false` in PowerShell.

**Copy the `backups/` folder to a place outside this PC.** An external drive or a private cloud folder is enough. A copy on the same disk does not survive a disk failure. Do this at least once a month.

## Restore option A: undo a recent mistake (Time Travel, up to 7 days)

Use this when an admin deleted something, or a migration went wrong, in the last 7 days.

1. Find the bookmark of a moment before the mistake: `npx wrangler d1 time-travel info bekasi-bgh --timestamp=<unix seconds or ISO time>`.
2. Restore: `npx wrangler d1 time-travel restore bekasi-bgh --bookmark=<bookmark>`.
3. The command prints the bookmark of the state before the restore. Keep it. It undoes the restore.
4. Check the site.

For the sandbox add `--env staging` and use the name `bekasi-bgh-staging`.

Time Travel restores the whole database. Changes after the bookmark are lost.

## Restore option B: from a dump file (older than 7 days, or the account is lost)

1. Put the dump in an order that SQLite accepts. The export lists a child table before its parent, so a plain import fails:
   `npm run restore-prepare -- backups/production/<date>/db.sql`
   This writes `db.ordered.sql` next to it.
2. Create a new database: `npx wrangler d1 create bekasi-bgh-new`. Copy the `database_id` into `wrangler.jsonc`.
3. Load it: `npx wrangler d1 execute bekasi-bgh-new --remote --file backups/production/<date>/db.ordered.sql`.
4. Deploy: `npm run deploy`.
5. Check the site. Then delete the old database, if you still have it.

To check a dump without touching any live database: `npm run restore-check -- --env staging`. It loads the newest dump into a local scratch database and compares the row count of every table with the live one.

## Restore the pictures

For each file in `backups/production/pictures/`:
`npx wrangler r2 object put bekasi-bgh-uploads/<key> --file backups/production/pictures/<key> --remote`
The key is the path inside `pictures/`, for example `avatars/<id>.jpg`. The database already holds the keys.

## Full disaster order (new PC, or lost Cloudflare account)

1. Get the code from the GitHub repository: `git clone`, then `npm install`.
2. Get the secrets from the password manager (`docs/secrets.md`). Make `.dev.vars`.
3. Log in: `npx wrangler login` with the community Google account.
4. Create the databases and the buckets (`wrangler d1 create`, `wrangler r2 bucket create`). Put the new ids in `wrangler.jsonc`.
5. Run the migrations, then restore the data (option B and the pictures step).
6. Set the secrets (`wrangler secret put <NAME>`), then `npm run deploy`.
7. In the Google console, add the new address to the OAuth client (origin and redirect URI).

## What is not covered

- **Secrets.** A lost secret cannot be read back from Cloudflare. See `docs/secrets.md` for what each loss breaks.
- **The Cloudflare account itself.** If Cloudflare locks it, use the full disaster order.
- **Changes between two backups.** The dump is weekly. Time Travel covers the last 7 days.

## Drill log

| Date | Drill | Result |
|---|---|---|
| 2026-11-20 | Time Travel on the sandbox: noted a bookmark, added a marker row, restored to the bookmark | The marker row was gone. Users and posts were intact. |
| 2026-11-20 | Dump of the sandbox loaded into a local scratch database (`npm run restore-check`) | All 23 tables matched the live database. |
| 2026-11-20 | Ordered dump loaded into a new remote D1 database. Then I deleted the scratch database | 291 queries ran without error. User, profile, post, session, and user_game counts matched the dump. |
| 2026-11-20 | Real site: first backup and `npm run restore-check` | All 23 tables matched. |
| 2026-11-20 | The weekly Windows task, started by hand | Result code 0. The log shows the real database dump. |

Repeat a drill after each migration that changes tables, and at least every 3 months.

## Finding made during the drill

A plain `wrangler d1 export` file cannot be imported as it is: it lists tables alphabetically, and a child table (for example `account`) comes before its parent (`user`). SQLite then reports "no such table". `app/lib/dump-order.ts` fixes the order, and a unit test covers it.
