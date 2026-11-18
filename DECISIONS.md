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
| 13 | 2026-11-18 | ~~One dark theme~~ (replaced by 16); every control at least 44px tall (shadcn sizes raised) | Owner's UI rules for real users |
| 16 | 2026-11-18 | ~~"Game night table" sticker design~~ (replaced by 18 after the anti-slop audit) | Owner found it generic and template-like |
| 18 | 2026-11-18 | Design comes from the owner's player card sketch, written down in `DESIGN.md`: Montserrat, orange card header, round game tokens, numbered black markers, one shadow (the card), flat everything else. Audits live in `docs/anti-slop/` | Anti-Slop audit 001: the previous pass stacked trend tropes instead of using the owner's own design language |
| 19 | 2026-11-18 | Design changes are made by hand in source, never by replacement scripts | Anti-Slop R-33 |
| 17 | 2026-11-18 | Email-code limits: real site keeps Better Auth's 3 sign-ins/min and 3 code requests/5 min per IP; sandbox allows 200 per 5 min | Real site resists code guessing and mail spam; sandbox testers share one Wi-Fi and test runs sign in many users |
| 20 | 2026-11-18 | Phase 2 and 3 built together (migration 0001, additive only): game-page one-tap actions, plays with confirmation, tables, places, feed with likes and comments, search, reports, in-app notifications, privacy/terms/safety pages, phone bottom bar with "+" | Owner said "start it all" after the Reroll comparison (`docs/reroll-comparison.md`) |
| 21 | 2026-11-18 | A play counts for a member (hotness, badges) only after that member confirms it; the logger is confirmed automatically, guests need no account. Unconfirmed members are not named in the feed post | Reroll's rule: nobody can put numbers on your profile by typing your name |
| 22 | 2026-11-18 | Hotness order: confirmed plays logged here (3 or more), then the member's BGG plays, then BGG's hot list (shown, never stored) | Owner's rule, now with real plays behind it |
| 23 | 2026-11-18 | Badges are computed from counts on every card view (no badge table): First Roll, Regular, Host, Explorer, Wide Shelf, Trader | Nothing to keep in sync; thresholds are small because the community is |
| 24 | 2026-11-18 | Notifications are in-app only (bell + page). Web push is not built | Push needs a service worker, VAPID keys and iOS home-screen install: a separate piece of work |
| 25 | 2026-11-18 | Tables and places: tables are public to read (shareable in WhatsApp) but joining needs an account; plays, feed, search and the member directory are members-only; places are public and in the sitemap | Owner wants exposure from non-members without exposing members' activity |
| 26 | 2026-11-18 | All times are Jakarta time, formatted by hand (`app/lib/dates.ts`), not with Intl | Intl differs between server and browser and caused hydration errors on another project |
| 27 | 2026-11-18 | Delete account is in Settings (type your username to confirm); removes card, photo, posts, comments, hosted tables, picture files and takes the member off plays | Privacy page promises it |
| 28 | 2026-11-18 | Privacy, terms and safety pages are plain-language drafts written by Claude, **not reviewed by a lawyer**; contact is "ask an admin in the WhatsApp group" (no email published) | Owner to review before launch and decide the public contact |

## Design kit

- Charcoal Satin lives in `app/components/charcoal-satin.tsx` + `app/lib/gradient-engine/`. The shadcn CLI flattened the engine's folders into `app/lib` (shader files overwrote each other), so the engine was re-written from `design-kit/gradient/gradient-engine.registry.json` with its real paths. Re-adding it with the CLI will break it again.
- Motion AI Kit (`npx motion-ai`) is interactive; the owner runs it in a terminal.

## Research
- `research/raw/` — screenshots + JSON outlines. Blocked by robots.txt: BGA, Letterboxd, Meetup, Snakes & Lattes, Dicebreaker. Ludopedia showed a Cloudflare challenge.
