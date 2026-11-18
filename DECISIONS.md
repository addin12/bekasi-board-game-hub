# Decisions

Status: Phase 1 live on two sites (sandbox + real), see README. Full report: [docs/brainstorm-report.html](docs/brainstorm-report.html), published at https://claude.ai/artifact/EZBiTBdn9ftLUgYtMtmjig

| # | Date | Decision | Why |
|---|------|----------|-----|
| 1 | 2026-11-18 | English first, Indonesian later | Owner's call |
| 2 | 2026-11-18 | Research by local headless Chrome (Playwright), respecting robots.txt; no Firecrawl | No Firecrawl key; "use what's convenient" |
| 3 | 2026-11-18 | BGG data only through the owner's API access, never scraped | BGG terms |
| 4 | 2026-11-18 | Player card = one `user_games(user, bgg_id, kind)` table drives every filter | Owner: "intinya filter database" |
| 5 | 2026-11-18 | Stack: React Router 8 on Cloudflare Workers (SSR) + D1 via Drizzle + R2 + Better Auth (email code + Google) + shadcn/ui. NOT the Quest Board TPK static-export setup | Every page here is live and per person; link previews need per-page server rendering; owner asked for the best stack |
| 6 | 2026-11-18 | Trade deals happen off-site (WhatsApp); app never handles money | Owner confirmed |
| 7 | 2026-11-18 | Name: **Bekasi Board Game Hub**; built for our community first, public pages for reach | Owner's call |
| 8 | 2026-11-18 | Sign-in: any email (one-time code) plus Google sign-in | Owner's call |
| 9 | 2026-11-18 | Hotness is automatic from logged sessions; too few sessions → the member's recent BGG plays, else BGG's global Hotness list | Owner: "get it from BGG for a while" |
| 10 | 2026-11-18 | BGG token lives in `.dev.vars` (gitignored) locally and as a Worker secret in production | Never in the repo or in notes |
| 11 | 2026-11-18 | Visitors only see games already cached; only signed-in members trigger BGG calls | Random /g/<id> requests could otherwise burn our BGG quota |
| 12 | 2026-11-18 | The global BGG hot list is shown on a card as a fallback but never stored in user_game | Otherwise every new member would "match" on the same 3 games in Find |
| 14 | 2026-11-18 | Two sites: sandbox (`env.staging`, own D1/R2/secrets, fake demo members, `name@sandbox.test` + code 000000, noindex, looser code limit) and real. Sandbox sign-in only when `SANDBOX="1"`; the real site sets `"0"` | Owner wants a place to test and simulate without touching real data |
| 15 | 2026-11-18 | Sign-in page hides a method that isn't configured and says "Sign-in opens soon" when none is | Better Auth answers "sent" even when the mail send fails, so people would wait for codes that never arrive |
| 13 | 2026-11-18 | One dark theme; every control at least 44px tall (shadcn sizes raised) | Brand look + owner's UI rules for real users |

## Design kit

- Charcoal Satin lives in `app/components/charcoal-satin.tsx` + `app/lib/gradient-engine/`. The shadcn CLI flattened the engine's folders into `app/lib` (shader files overwrote each other), so the engine was re-written from `design-kit/gradient/gradient-engine.registry.json` with its real paths. Re-adding it with the CLI will break it again.
- Motion AI Kit (`npx motion-ai`) is interactive; the owner runs it in a terminal.

## Research
- `research/raw/` — screenshots + JSON outlines. Blocked by robots.txt: BGA, Letterboxd, Meetup, Snakes & Lattes, Dicebreaker. Ludopedia showed a Cloudflare challenge.
