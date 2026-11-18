# Design direction

Source: the owner's player card sketch (`brainstorm/player-card.png`) and the brief "playful community hobbyist". This file is the direction; `docs/anti-slop/` holds the filter audits.

Design Read: community hub web app for Bekasi board gamers, phone first, in the owner's player-card language. Dial: ENERGY 2 / RHYTHM 2 / MOTION 1.

## Identity

- **The player card is the hero object.** White card, orange header, name big and bold, thin black rules between sections. It is the only element with a drop shadow, because it is the one "physical" thing on the table.
- **Game tokens.** Game covers are round, with a thin ink ring, like the sketch. Favorites overlap like a stack of tokens.
- **Numbered black markers.** Solid black circles with white numbers, used only when pointing at parts of a card (as in the sketch).
- **Category labels.** Uppercase, bold, filled icon, one color each: Favorites red, Hotness orange, Want to play blue, Trade green. Used on the card and in Find results, nowhere else.

## Tokens

| Token | Value | Why |
|---|---|---|
| Ink | `#1e1b2e` | Text and rules; softer than pure black |
| Brand orange | `#f26522` | The sketch's card header; also main buttons (ink text, 5.3:1) |
| Page | `#f5f2ee` | Warm neutral so white cards read as objects |
| Card | `#ffffff` | The sketch's white card |
| Muted text | `#5c566b` | Secondary text, 7.0:1 on white, 6.3:1 on the page |
| Category text | fav `#c8102e`, hot `#c2410c`, want `#0a5fa8`, trade `#1f7a35` | Sketch hues, darkened to pass 4.5:1 |

Type: **Montserrat** (variable) for everything: the sketch is set in it. 800 for names and page titles, 700 for labels and buttons, 500 body. Body 16px, line height 1.5.

Radius: card 20px, controls 10px, tokens and avatars round.

Light theme only: the sketch is a white card, and people use the site at cafés and tables in daylight.

## Motion

Hover and press states only, plus a thin orange progress bar while a page loads. No scroll reveals, no floating. Everything respects reduced motion.
