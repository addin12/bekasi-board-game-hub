# Design direction

Sources: the owner's player card sketch (`brainstorm/player-card.png`) and the brief "playful community hobbyist". This file states the direction. `docs/anti-slop/` holds the filter audits.

Design Read: a community hub web app for Bekasi board gamers. It is phone first and uses the language of the owner's player card. Dial: ENERGY 2 / RHYTHM 2 / MOTION 1.

## Identity

- **The player card is the hero object.** It has a white card, an orange header, a big bold name, and thin black rules between sections. It is the only element with a drop shadow, because it is the one physical object on the table.
- **Logo and app icon.** The owner supplied the logo: a white lowercase "b" that holds a die with five pips, on a dark purple field (#2c1132). We use it for the app icon, the favicon, the Home Screen icon, and the Google sign-in screen. The source file is `branding/logo-source.jpg`. The purple belongs to the icon only. The site header keeps its text wordmark until the owner asks us to place the logo there.
- **Game tokens.** Game covers are round, with a thin ink ring, as in the sketch. Favorites overlap like a stack of tokens.
- **Numbered black markers.** A marker is a solid black circle with a white number. Use it only to point at a part of a card, as in the sketch.
- **Category labels.** Labels are uppercase and bold. Each has a filled icon and one color: Favorites red, Hotness orange, Want to play blue, Trade green. Use them on the card and in Find results only.

## Tokens

| Token | Value | Reason |
|---|---|---|
| Ink | `#1e1b2e` | Text and rules. It is softer than pure black. |
| Brand orange | `#f26522` | The card header color in the sketch. Main buttons also use it, with ink text (5.3:1). |
| Page | `#f5f2ee` | A warm neutral. White cards then look like objects. |
| Card | `#ffffff` | The white card in the sketch. |
| Muted text | `#5c566b` | Secondary text. Contrast is 7.0:1 on white and 6.3:1 on the page. |
| Category text | fav `#c8102e`, hot `#c2410c`, want `#0a5fa8`, trade `#1f7a35` | The hues from the sketch, darkened to pass 4.5:1. |

Type: **Montserrat** (variable) for all text, because the sketch uses it. Weight 800 for names and page titles. Weight 700 for labels and buttons. Weight 500 for body text. Body size is 16px. Line height is 1.5.

Radius: 20px for cards, 10px for controls. Tokens and avatars are round.

The site has a light theme only. The sketch is a white card. People use the site in cafés and at tables in daylight.

## Motion

Use hover and press states. Show a thin orange progress bar while a page loads. Do not use scroll reveals or floating elements. All motion respects the reduced-motion setting.
