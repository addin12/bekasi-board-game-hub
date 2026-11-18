# Bekasi Board Game Hub

A community site for Bekasi board gamers. Every member has a **player card** (favorites, hotness, want to play, trade list), and the site matches cards: like-minded players, people to play with, and buyers/sellers.

Stack: React Router 8 on Cloudflare Workers, D1 (SQLite) through Drizzle, R2 for avatars, Better Auth (email code + Google), shadcn/ui + Tailwind 4. Game data from the BoardGameGeek XML API.

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

## First production deploy (not done yet)

1. `wrangler d1 create bekasi-bgh` and put the id in `wrangler.jsonc`.
2. `wrangler r2 bucket create bekasi-bgh-uploads`.
3. `wrangler secret put` for `BGG_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and optionally Google and mail.
4. Set `ADMIN_EMAILS` in `wrangler.jsonc`.
5. `npm run db:migrate:remote && npm run deploy`.
