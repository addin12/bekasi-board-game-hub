# Decisions

Status on 2026-11-19: Phase 1 to 3 and the back office run on two sites (sandbox and real). See the README. The real site shipped on 2026-11-18. Sign-in is closed on the real site until Google keys or a mail relay exist. Full report: [docs/brainstorm-report.html](docs/brainstorm-report.html). It is also published at https://claude.ai/artifact/EZBiTBdn9ftLUgYtMtmjig

Struck-through rows are replaced by a later row. The row numbers are not in date order.

| # | Date | Decision | Reason |
|---|------|----------|--------|
| 1 | 2026-11-18 | Write the site in English first. Add Indonesian later. | The owner decided this. |
| 2 | 2026-11-18 | Do research with local headless Chrome (Playwright) and obey robots.txt. Do not use Firecrawl. | There is no Firecrawl key. The owner said to use what is convenient. |
| 3 | 2026-11-18 | Get BGG data only through the owner's API access. Never scrape BGG. | BGG terms. |
| 4 | 2026-11-18 | One table, `user_games(user, bgg_id, kind)`, drives every filter on the player card. | The owner said the core of the idea is a database filter. |
| 5 | 2026-11-18 | Use React Router 8 on Cloudflare Workers (SSR), D1 through Drizzle, R2, Better Auth (email code and Google), and shadcn/ui. Do not use the static-export setup of Quest Board TPK. | Every page is live and specific to a person. Link previews need server rendering for each page. The owner asked for the best stack. |
| 6 | 2026-11-18 | Trades happen off-site (WhatsApp). The app never handles money. | The owner confirmed this. |
| 7 | 2026-11-18 | The name is **Bekasi Board Game Hub**. Build for our community first. Public pages give reach. | The owner decided this. |
| 8 | 2026-11-18 | Sign-in uses any email (one-time code) or Google. | The owner decided this. |
| 9 | 2026-11-18 | Hotness comes from logged sessions. If the member has too few sessions, use the member's recent BGG plays. If there are none, use the BGG global Hotness list. | The owner said to take it from BGG for a while. |
| 10 | 2026-11-18 | The BGG token is in `.dev.vars` (ignored by git) on your computer and is a Worker secret in production. | The token must never be in the repo or in notes. |
| 11 | 2026-11-18 | Visitors see only games that are already cached. Only signed-in members start BGG calls. | Random `/g/<id>` requests could use up our BGG quota. |
| 12 | 2026-11-18 | A card shows the BGG global hot list as a fallback. The app never stores it in `user_game`. | Stored values would make every new member match on the same 3 games in Find. |
| 14 | 2026-11-18 | There are two sites. The sandbox (`env.staging`) has its own D1, R2, secrets, fake demo members, `name@sandbox.test` with code 000000, noindex, and a looser code limit. The real site is separate. Sandbox sign-in works only when `SANDBOX="1"`. The real site sets `"0"`. | The owner wants a place to test and simulate without risk to real data. |
| 15 | 2026-11-18 | The sign-in page hides a method that is not configured. It shows "Sign-in opens soon" when no method is configured. | Better Auth answers "sent" even when the mail send fails. People would wait for codes that never arrive. |
| 13 | 2026-11-18 | ~~One dark theme~~ (replaced by 16). Every control is at least 44px tall (the shadcn sizes are raised). | These are the owner's UI rules for real users. |
| 16 | 2026-11-18 | ~~"Game night table" sticker design~~ (replaced by 18 after the anti-slop audit). | The owner found it generic and like a template. |
| 18 | 2026-11-18 | The design comes from the owner's player card sketch. `DESIGN.md` records it: Montserrat, orange card header, round game tokens, numbered black markers, one shadow (the card), and flat elements elsewhere. Audits are in `docs/anti-slop/`. | Anti-Slop audit 001 found that the previous pass stacked trend tropes. It did not use the owner's own design language. |
| 19 | 2026-11-18 | Make design changes by hand in the source. Never use replacement scripts. | Anti-Slop rule R-33. |
| 17 | 2026-11-18 | Email-code limits: the real site keeps the Better Auth limits (3 sign-ins per minute and 3 code requests per 5 minutes for each IP). The sandbox allows 200 per 5 minutes. | The real site must resist code guessing and mail spam. Sandbox testers share one Wi-Fi network, and test runs sign in many users. |
| 20 | 2026-11-18 | Phase 2 and 3 were built together (migration 0001, additive only). They add one-tap actions on the game page, plays with confirmation, tables, places, a feed with likes and comments, search, reports, in-app notifications, privacy, terms and safety pages, and a phone bottom bar with "+". | The owner said "start it all" after the Reroll comparison (`docs/reroll-comparison.md`). |
| 21 | 2026-11-18 | A play counts for a member (hotness, badges) only after that member confirms it. The logger is confirmed automatically. Guests need no account. The feed post does not name unconfirmed members. | Reroll uses this rule. Nobody can add numbers to your profile by typing your name. |
| 22 | 2026-11-18 | Hotness order: confirmed plays logged here (3 or more), then the member's BGG plays, then the BGG hot list (shown, never stored). | This is the owner's rule. Real plays now support it. |
| 23 | 2026-11-18 | The app computes badges from counts on each card view. There is no badge table. The badges are First Roll, Regular, Host, Explorer, Wide Shelf, and Trader. | There is nothing to keep in sync. The thresholds are small because the community is small. |
| 24 | 2026-11-18 | Notifications are in-app only (bell and page). Web push is not built. | Push needs a service worker, VAPID keys, and an iOS home-screen install. That is separate work. |
| 25 | 2026-11-18 | Anyone can read tables, so people can share them in WhatsApp. Joining needs an account. Plays, feed, search, and the member directory are for members only. Places are public and are in the sitemap. | The owner wants exposure from non-members. The owner does not want to expose member activity. |
| 26 | 2026-11-18 | All times are Jakarta time. `app/lib/dates.ts` formats them by hand. It does not use Intl. | Intl gives different results on the server and in the browser. It caused hydration errors in another project. |
| 27 | 2026-11-18 | Delete account is in Settings. The member types their username to confirm. The action removes the card, photo, posts, comments, hosted tables, and picture files. It also removes the member from plays. | The privacy page promises this. |
| 29 | 2026-11-18 | The back office is at `/admin` (members, content, site text, log). Migration 0002 adds `audit_log`. Admins are the emails in `ADMIN_EMAILS`. The UI never adds or removes admins and cannot delete an admin account. | The owner asked for a back end to edit the web app without code. |
| 30 | 2026-11-18 | Every admin loader and every admin action calls `requireAdmin`. A non-admin gets a plain 404. The layout loader alone is not enough. A client-side move between child routes skips it, and actions do not run through it. | We found this during design. The access-control checks cover it. |
| 31 | 2026-11-18 | The `setting` table stores the editable site text (home headline and intro, banner, contact line, footer) as `site.*`. The text is plain, has a length limit, and has defaults in code. | The owner can change wording and announce a play day without a deploy. |
| 32 | 2026-11-18 | The app writes every admin action to `audit_log` (who, what, which target, short detail). The app cannot edit or delete these rows. | Security rule: write security events to an append-only log. |
| 33 | 2026-11-18 | The unslop pass covers copy and details only. The owner chose this. A single-sentence UI string has no trailing period. The site uses one icon size and stroke, and a 4px spacing scale. Heavy weights, uppercase labels, and the card style stay, because they come from the owner's sketch. See `docs/unslop/`. | The owner chose "copy and details only". |
| 34 | 2026-11-18 | Every page sets `data-hydrated` on `<html>` when it becomes interactive. Test scripts wait for it. | This caught a page that never became interactive and showed no error. |
| 28 | 2026-11-18 | The privacy, terms, and safety pages are plain-language drafts that Claude wrote. **A lawyer has not reviewed them.** The contact is "ask an admin in the WhatsApp group". The pages publish no email. | The owner must review them before launch and decide the public contact. |
| 35 | 2026-11-19 | Write the README, DESIGN.md, and DECISIONS.md in ASD-STE100 style. Do not apply it to the UI copy of the site. | The owner asked for it. The skill excludes marketing and creative copy. |

## Design kit

- Charcoal Satin is in `app/components/charcoal-satin.tsx` and `app/lib/gradient-engine/`. The shadcn CLI put the engine folders in one flat `app/lib` folder, and the shader files overwrote each other. We rewrote the engine from `design-kit/gradient/gradient-engine.registry.json` with its real paths. If you add it again with the CLI, it breaks again.
- Motion AI Kit (`npx motion-ai`) is interactive. The owner runs it in a terminal.

## Research

`research/raw/` holds screenshots and JSON outlines. robots.txt blocked these sites: BGA, Letterboxd, Meetup, Snakes & Lattes, and Dicebreaker. Ludopedia showed a Cloudflare challenge.
