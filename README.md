# Bekasi Board Game Hub

This is a community site for board gamers in Bekasi. Each member has a **player card**. The card shows favorite games, hotness, games the member wants to play, and a trade list. The site matches cards to find like-minded players, people to play with, and buyers and sellers.

The site also has these features:

- Members log plays. The people in a play confirm it. Confirmed plays set Hotness and badges.
- Members open tables that other members can join.
- A places directory.
- A community feed with likes and comments.
- Search, reports for admins, in-app notifications, and phone push notifications.
- A play-style quiz. The result shows on the card and helps Find.
- A one-tap "add to my card" button on each game page.

## Back office

The back office is at `/admin`. Only the emails in `ADMIN_EMAILS` can open it. An admin can do these tasks:

- Read the overview and the report queue.
- Search members, add the Verified badge, edit their details, delete a photo, or delete an account.
- Delete posts, comments, and plays. Cancel tables. Edit or delete places.
- Edit the site text: home headline, intro, banner, contact line, footer, and member passcode.
- Read the log of every admin action.

## Stack

- React Router 8 on Cloudflare Workers.
- D1 (SQLite) through Drizzle.
- R2 for pictures.
- Better Auth (email code and Google).
- shadcn/ui and Tailwind 4.
- Game data from the BoardGameGeek XML API.

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars     # fill BGG_TOKEN and BETTER_AUTH_SECRET
npm run db:migrate:local           # creates the local D1 database
npm run dev                        # http://localhost:5173
```

Without a mail relay, the dev server prints sign-in codes in its console.

## Scripts

| Command | Action |
|---|---|
| `npm run dev` | Start the dev server with local D1 and R2 |
| `npm run typecheck` | Run the TypeScript compiler on Worker types, route types, and the app |
| `npm test` | Run unit tests (Vitest) |
| `npm run db:generate` | Create a SQL migration from `app/db/schema.ts` |
| `npm run db:migrate:local` / `:remote` | Apply migrations |
| `npm run deploy` | Build and deploy the Worker |
| `npm run vapid` | Print a new web push key pair |

## Configuration

Secrets are in `.dev.vars` on your computer (see `.dev.vars.example`). In production, they are Worker secrets (`wrangler secret put NAME`). Plain settings (`APP_NAME`, `ADMIN_EMAILS`) are in `wrangler.jsonc`.

## Where things are

- `app/db/schema.ts`: all tables. The `user_game` table (person, game, kind) drives every filter.
- `app/lib/.server/`: server-only code (auth, BGG client, card queries, passcode).
- `app/lib/*.ts`: pure logic. The server and the browser share it. Tests are in `tests/unit`.
- `app/routes/`: pages. `routes.ts` lists them.
- `docs/brainstorm-report.html` and `DECISIONS.md`: the reasons for each choice.

## The two live sites

| Site | URL | Data | Sign-in |
|---|---|---|---|
| Sandbox (test and simulation) | https://bekasi-board-game-hub-staging.bbgc.workers.dev | Fake demo members. The data can be wiped. | Any `name@sandbox.test` with code `000000`. Example: `raka@sandbox.test`. The admin is `admin@sandbox.test`. |
| Real | https://bekasi-board-game-hub.bbgc.workers.dev | Real members | Google or email code, after you configure them |

Each site has its own Worker, D1 database, R2 bucket, and secrets. In `wrangler.jsonc`, the top level is the real site and `env.staging` is the sandbox. The sandbox sends `X-Robots-Tag: noindex`.

### Release flow

1. Change the code.
2. Run `npm run typecheck && npm test`.
3. Run `npm run deploy:sandbox`.
4. Test the change on the sandbox.
5. Run `npm run deploy`.

For a new migration, run `npm run db:migrate:sandbox` first. Then run `npm run db:migrate:remote`.

To reset the demo members, run `npm run seed:sandbox`.

### Secrets

Set a secret on the real site with `wrangler secret put NAME`. Set it on the sandbox with `wrangler secret put NAME --env staging`.

- Set now: `BGG_TOKEN`, `BETTER_AUTH_SECRET` (a different value on each site), and `BETTER_AUTH_URL`.
- Set on the real site only: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The sandbox has no Google redirect URI.
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (web push). Each site has its own pair.
- `GMAIL_USER` and `GMAIL_APP_PASSWORD` (email sign-in codes). Not set yet.
- `MAIL_RELAY_URL` and `MAIL_RELAY_SECRET` (optional second choice). Not set.

### State on 2026-11-19 (updated)

Both sites run in the bekasibgcom@gmail.com Cloudflare account (workers.dev subdomain `bbgc`). They run migration `0002_admin_log` and the same code. The real site signs in with Google only. Google sign-in is on (secrets set 2026-11-19). We deleted the old resources in the addinalayubi12 account on 2026-11-19.
