# Bekasi Board Game Hub

A community site for Bekasi board gamers. Every member has a **player card** (favorites, hotness, want to play, trade list), and the site matches cards: like-minded players, people to play with, and buyers/sellers.

Beyond the card: log plays (confirmed by the people on them, which feeds Hotness and badges), open tables others can join, a places directory, a community feed with likes and comments, search, reports for admins, in-app notifications, and one-tap "add to my card" on every game page.

Stack: React Router 8 on Cloudflare Workers, D1 (SQLite) through Drizzle, R2 for pictures, Better Auth (email code + Google), shadcn/ui + Tailwind 4. Game data from the BoardGameGeek XML API.

**Before the next real-site deploy:** this code needs migration `0001_phase2` on the real database first (`npm run db:migrate:remote`), then `npm run deploy`. The sandbox already has both.

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars     # fill BGG_TOKEN and BETTER_AUTH_SECRET
npm run db:migrate:local           # creates the local D1 database
npm run dev                        # http://localhost:5173
```

Without a mail relay, sign-in codes are printed in the dev server console.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with local D1 and R2 |
| `npm run typecheck` | Worker types, route types, `tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run db:generate` | New SQL migration from `app/db/schema.ts` |
| `npm run db:migrate:local` / `:remote` | Apply migrations |
| `npm run deploy` | Build and deploy the Worker |

## Configuration

Secrets live in `.dev.vars` locally (see `.dev.vars.example`) and as Worker secrets in production (`wrangler secret put NAME`). Plain settings (`APP_NAME`, `ADMIN_EMAILS`) are in `wrangler.jsonc`.

## Where things are

- `app/db/schema.ts`: all tables. The `user_game` table (person + game + kind) drives every filter.
- `app/lib/.server/`: server-only code (auth, BGG client, card queries, passcode).
- `app/lib/*.ts`: pure logic shared by server and browser (tested in `tests/unit`).
- `app/routes/`: pages. `routes.ts` lists them.
- `docs/brainstorm-report.html`, `DECISIONS.md`: why things are the way they are.

## The two live sites

| Site | URL | Data | Sign-in |
|---|---|---|---|
| Sandbox (test + simulation) | https://bekasi-board-game-hub-staging.addinalayubi12.workers.dev | Fake demo members, may be wiped | Any `name@sandbox.test` with code `000000` (e.g. `raka@sandbox.test`, admin: `admin@sandbox.test`) |
| Real | https://bekasi-board-game-hub.addinalayubi12.workers.dev | Real members | Google and/or email code, once configured |

Each has its own Worker, D1 database, R2 bucket and secrets (`wrangler.jsonc`: top level = real, `env.staging` = sandbox). The sandbox sends `X-Robots-Tag: noindex`.

**Release flow:** change → `npm run typecheck && npm test` → `npm run deploy:sandbox` → try it on the sandbox → `npm run deploy`.
New migration: `npm run db:migrate:sandbox` first, then `npm run db:migrate:remote`.
Reset the demo members: `npm run seed:sandbox`.

Secrets per site: `wrangler secret put NAME` (real) or `wrangler secret put NAME --env staging` (sandbox). Set today: `BGG_TOKEN`, `BETTER_AUTH_SECRET` (different per site), `BETTER_AUTH_URL`. Still to add: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, `MAIL_RELAY_URL` + `MAIL_RELAY_SECRET`.
