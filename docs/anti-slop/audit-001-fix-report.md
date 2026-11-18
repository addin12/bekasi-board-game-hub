# Anti-slop audit 001: fix report (2026-11-18)

All 20 findings in `audit-001-2026-11-18.md` were approved ("de-slop it all") and fixed. Deployed to the sandbox only; the real site still runs the older dark design until the owner approves.

Design Read: community hub web app for Bekasi board gamers, phone first, in the owner's player-card sketch language. Dial: ENERGY 2 / RHYTHM 2 / MOTION 1. Direction file: `DESIGN.md`.

## What changed

| # | Fix |
|---|---|
| 1 | Logo removed; text wordmark "BEKASI BOARD GAME HUB" |
| 2 | Orange progress bar + `aria-busy` while any page or form loads |
| 3 | Every game cover and avatar has width/height |
| 4 | One global `:focus-visible` ring (3px blue, 2px offset) |
| 5 | This pass written by hand in source (Edit/Write), no replacement scripts |
| 6 | `DESIGN.md` written from the sketch, with token contrast values |
| 7 | Dot grid removed |
| 8 | Shadow only on the player card; everything else flat with a hairline border |
| 9 | Icons only on the 4 category labels (filled, like the sketch) + map pin + chip close; decorative icon tiles gone |
| 10 | Eyebrow pill removed |
| 11, 15 | Home rebuilt: headline + one action + example card; "What each part of your card finds" uses the sketch's numbered markers; newest members are real rows |
| 12 | Montserrat (the sketch's face) replaces Bricolage Grotesque + Nunito |
| 13 | All tilts and the marker highlight removed, except the example card (a card dropped on the table) |
| 14 | Card header is plain sketch orange |
| 16 | Palette: ink, brand orange, warm neutrals; category colors only on labels |
| 17, 20 | Card matches the sketch: name in the orange header, solid rules, overlapping round favorite tokens, round tokens everywhere, trade arrows on the token corner |
| 18 | Radius system: card 20px, controls 10px, tokens round |
| 19 | Find modes are a tab bar; filter chips have "Remove filter" names |

Found and fixed during the click-through:
- Find listed the same game twice when it was both a favorite and a hot game (`uniqueMatches`, unit-tested).
- After removing a district chip the dropdown still showed the old district (form now remounts on filter change).
- Wordmark (35px) and two text links (18px, 24px) were under 44px.
- Filled shopping bag lost its handle; it now shows a white handle like the sketch.

## Delivery Gate

### Block 1: Hard Gate (all must be "no")
- R-02 NO: no em dash in UI text (searched `app/routes`, `app/components`).
- R-03 NO: click-through on 390px and 1280px, no horizontal overflow on home, sign-in, card, game, Find, card editor; every control 44px or taller (checked by script).
- R-17, R-18, R-36, R-38 NO: no statistics, testimonials or claims. The home example card is labeled "Example card"; demo members exist only on the sandbox, which says so in a banner.
- R-23 NO: no invented logo or photos; members without a photo get their initial.
- R-24, R-26 NO: nav = Find, My card, Settings, Admin (admins), Sign in; all real pages. No dead buttons.
- R-25 NO: token pairs measured: ink on orange 5.32, muted on white 7.00, muted on page 6.28, category labels 5.18 to 6.53, field border 3.4 (non-text).
- R-27 NO: empty states (Find, card sections, game tabs), loading (progress bar, "Searching BoardGameGeek…", "Saving…"), errors (field errors, toasts, BGG down message, error page).
- R-32 NO: Tab reaches the nav with a visible solid outline (checked on both viewports); tabs and selects are native or Radix.
- R-33 NO: written in source.
- R-34 NO: one light theme, no toggle shipped.
- R-35 NO: click-through recorded below.
- R-37 NO: direction in `DESIGN.md`.
- R-39 NO: pointer cursor set in base CSS; actions are buttons, navigation is links; icons `aria-hidden`; every field has a visible label; motion stops under reduced motion.
- R-40 NO: media have dimensions; no third-party scripts; no performance numbers claimed (not measured).

### Block 2: Purpose-Gate (all must be "no")
- R-01 NO: no gradients. R-04 NO: only category icons, each written into DESIGN.md. R-06 NO: Montserrat because the owner's sketch uses it; uppercase only on card labels and the wordmark (sketch). R-07 NO: no background pattern. R-08 NO: no arrows on buttons. R-09 NO: the only badge is "Verified member", a real status. R-10, R-13 NO: no glass, no glow. R-12 NO: one shadow, on the player card, reason in DESIGN.md. R-14 NO: no feature cards. R-19 NO: hover/press + progress bar only (MOTION 1). R-22 NO: no illustrations.

### Block 3: Liveliness (all must be "yes")
- Dials declared: YES (ENERGY 2 / RHYTHM 2 / MOTION 1).
- Output matches dials: YES (home has three different section compositions; app pages stay calm).
- One focal point per screen: YES (home: headline + card; card page: the card; Find: results).
- Structural whitespace: YES. One accent: YES (orange: main button, card header, current tab, progress bar).
- Identity motif: YES (orange-header card, round game tokens, numbered black markers).
- Design Read declared: YES.

### Block 4: Craftsmanship & Quality Locks (all must be "no")
- C-1 to C-5 NO. R-05 NO (no hero + 3 cards; no 4-column footer). R-11 NO. R-15 NO ("Make my player card", "Add games to my card"). R-16 NO. R-20 NO (sketch-derived identity). R-21 NO (light only, reason in DESIGN.md). R-29 NO. R-30 NO. R-31 NO (reasons in DESIGN.md and code comments).

## Click-through evidence (live sandbox, phone 390px and desktop 1280px, 38/38 PASS)

- Home, sign-in, `/p/raka`, `/g/224517`, `/find`, `/me/edit` → load 200, no overflow, no targets under 44px.
- Sign in as `raka@sandbox.test` with the sandbox code → 200.
- Find "Buy & sell" tab → URL `mode=trade`, tab marked current.
- District "Rawalumbu" → URL updates, chip "Remove filter: district Rawalumbu" appears → click → filter gone, dropdown back to "All of Bekasi".
- Game page "Wants to play" tab → becomes active.
- Keyboard Tab → focused element shows a solid outline.
- Console → no errors on either viewport.

Not checked: real phones (only Chrome emulation), screen readers, Firefox/Safari.
