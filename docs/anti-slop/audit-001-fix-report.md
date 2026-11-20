# Anti-slop audit 001: fix report (2026-11-18)

The owner approved all 20 findings in `audit-001-2026-11-18.md` ("de-slop it all"). We fixed all of them. At that time, we deployed the fixes to the sandbox only. The real site still ran the older dark design until the owner approved the change.

Design Read: a community hub web app for Bekasi board gamers. It is phone first and uses the language of the owner's player card sketch. Dial: ENERGY 2 / RHYTHM 2 / MOTION 1. Direction file: `DESIGN.md`.

## What changed

| # | Fix |
|---|---|
| 1 | We removed the logo. The site shows the text wordmark "BEKASI BOARD GAME HUB". |
| 2 | An orange progress bar and `aria-busy` show while any page or form loads. |
| 3 | Every game cover and avatar has width and height. |
| 4 | One global `:focus-visible` ring (3px blue, 2px offset). |
| 5 | We wrote this pass by hand in the source (Edit and Write). We used no replacement scripts. |
| 6 | We wrote `DESIGN.md` from the sketch, with token contrast values. |
| 7 | We removed the dot grid. |
| 8 | Only the player card has a shadow. Everything else is flat with a hairline border. |
| 9 | Icons remain on the 4 category labels (filled, like the sketch), the map pin, and the chip close button. The decorative icon tiles are gone. |
| 10 | We removed the eyebrow pill. |
| 11, 15 | We rebuilt the home page. It has a headline, one action, and an example card. The section "What each part of your card finds" uses the numbered markers from the sketch. The newest members are real rows. |
| 12 | Montserrat (the face in the sketch) replaces Bricolage Grotesque and Nunito. |
| 13 | We removed all tilts and the marker highlight. The example card keeps its tilt, like a card dropped on the table. |
| 14 | The card header is plain orange, as in the sketch. |
| 16 | The palette is ink, brand orange, and warm neutrals. Category colors appear on labels only. |
| 17, 20 | The card matches the sketch. The name is in the orange header. The rules are solid. The favorite tokens are round and overlap. All tokens are round. The trade arrows are on the token corner. |
| 18 | The radius system is 20px for cards, 10px for controls, and round for tokens. |
| 19 | The Find modes are a tab bar. The filter chips have "Remove filter" names. |

We found and fixed these faults during the click-through:

- Find listed the same game twice when it was both a favorite and a hot game. The fix is `uniqueMatches`, and a unit test covers it.
- After you removed a district chip, the dropdown still showed the old district. The form now mounts again when the filter changes.
- The wordmark (35px) and two text links (18px and 24px) were under 44px.
- The filled shopping bag lost its handle. It now shows a white handle, as in the sketch.

## Delivery Gate

### Block 1: Hard Gate (every answer must be "no")

- R-02 NO: The UI text has no em dash. We searched `app/routes` and `app/components`.
- R-03 NO: We did a click-through at 390px and 1280px. Home, sign-in, card, game, Find, and card editor have no horizontal overflow. A script checked that every control is 44px or taller.
- R-17, R-18, R-36, R-38 NO: The site has no statistics, testimonials, or claims. The home example card has the label "Example card". Demo members exist only on the sandbox, and a banner says so.
- R-23 NO: We did not invent a logo or photos. A member without a photo gets an initial.
- R-24, R-26 NO: The navigation is Find, My card, Settings, Admin (admins only), and Sign in. All are real pages. No button is dead.
- R-25 NO: We measured the token pairs. Ink on orange is 5.32. Muted on white is 7.00. Muted on the page is 6.28. Category labels range from 5.18 to 6.53. The field border is 3.4 (non-text).
- R-27 NO: Empty states exist for Find, card sections, and game tabs. Loading states exist: the progress bar, "Searching BoardGameGeek…", and "Saving…". Error states exist: field errors, toasts, a BGG-down message, and an error page.
- R-32 NO: The Tab key reaches the navigation and shows a solid outline. We checked both viewports. Tabs and selects are native or Radix.
- R-33 NO: We wrote the changes in the source.
- R-34 NO: The site has one light theme and no toggle.
- R-35 NO: The click-through record is below.
- R-37 NO: `DESIGN.md` states the direction.
- R-39 NO: Base CSS sets the pointer cursor. Actions are buttons. Navigation items are links. Icons have `aria-hidden`. Every field has a visible label. Motion stops under reduced motion.
- R-40 NO: Media have dimensions. The site has no third-party scripts. We claim no performance numbers, because we did not measure them.

### Block 2: Purpose-Gate (every answer must be "no")

- R-01 NO: No gradients.
- R-04 NO: The site has only category icons. `DESIGN.md` records each one.
- R-06 NO: We use Montserrat because the owner's sketch uses it. Uppercase appears only on card labels and the wordmark, as in the sketch.
- R-07 NO: No background pattern.
- R-08 NO: No arrows on buttons.
- R-09 NO: The only badge is "Verified member". It is a real status.
- R-10, R-13 NO: No glass and no glow.
- R-12 NO: One shadow, on the player card. `DESIGN.md` gives the reason.
- R-14 NO: No feature cards.
- R-19 NO: The site has hover and press states and a progress bar only (MOTION 1).
- R-22 NO: No illustrations.

### Block 3: Liveliness (every answer must be "yes")

- Dials declared: YES (ENERGY 2 / RHYTHM 2 / MOTION 1).
- Output matches the dials: YES. The home page has three different section compositions. The app pages stay calm.
- One focal point on each screen: YES. Home has the headline and the card. The card page has the card. Find has the results.
- Structural whitespace: YES.
- One accent: YES. Orange appears on the main button, card header, current tab, and progress bar.
- Identity motif: YES. It is the orange-header card, round game tokens, and numbered black markers.
- Design Read declared: YES.

### Block 4: Craftsmanship and Quality Locks (every answer must be "no")

- C-1 to C-5 NO.
- R-05 NO: No hero with 3 cards. No 4-column footer.
- R-11 NO.
- R-15 NO: The buttons say "Make my player card" and "Add games to my card".
- R-16 NO.
- R-20 NO: The identity comes from the sketch.
- R-21 NO: The site has a light theme only. `DESIGN.md` gives the reason.
- R-29 NO.
- R-30 NO.
- R-31 NO: `DESIGN.md` and code comments give the reasons.

## Click-through evidence

We ran the click-through on the live sandbox at phone width (390px) and desktop width (1280px). 38 of 38 checks passed.

- Home, sign-in, `/p/raka`, `/g/224517`, `/find`, and `/me/edit` load with status 200. They have no overflow and no target under 44px.
- Sign-in as `raka@sandbox.test` with the sandbox code returns 200.
- The Find tab "Buy & sell" changes the URL to `mode=trade`. The tab shows as current.
- The district "Rawalumbu" updates the URL. The chip "Remove filter: district Rawalumbu" appears. A click on the chip removes the filter. The dropdown returns to "All of Bekasi".
- The game page tab "Wants to play" becomes active.
- The Tab key moves focus. The focused element shows a solid outline.
- The console shows no errors on either viewport.

We did not check these items: real phones (we used Chrome emulation only), screen readers, Firefox, and Safari. We tested Firefox and Safari engines on phone profiles later (see the phone check of 2026-11-19).
