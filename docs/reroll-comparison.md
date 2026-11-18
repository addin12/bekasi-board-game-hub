# Reroll.id vs Bekasi Board Game Hub (2026-11-18)

Method: public pages only, no sign-in, robots.txt respected, 2 s between requests. 85 of their 3,472 sitemap pages (every top-level page plus 1 to 2 samples of each page type; 2,689 of the 3,472 are game pages from one template). Plus their own "How Reroll works" page, which documents the signed-in features I could not open. Raw screenshots and outlines: `research/raw/reroll/` (not committed).

Not seen: anything behind sign-in (create-listing, log-a-play, booking, bidding, chat, notifications, the play-style quiz questions).

## What Reroll is

A generalist Indonesian board game platform: marketplace (listings, bookings, auctions, trade, wanted), a 2,662-game catalog, communities and cafes directory, events with RSVP, places with reviews, play log with scores, campaigns, blog and news, votes, pre-orders, giveaways, table tools (finger chooser, dice, scorepad, counters, "what should we play", mahjong calculator), a business/organization side, a Discord bot, EN/ID and light/dark.

It is a platform for the whole country. Its activity looks thin outside a few accounts (the superadmin profile alone has 22 plays and most of the feed), so breadth is its strength, not depth of community.

## Where we stand

| Area | Reroll | Ours now |
|---|---|---|
| Person page | Photo, badge ("First Player Token"), followers/following/plays, play style, level and weight, "looking for players" banner, tabs (posts, plays, events, discussions, reviews) | Card only (photo, bio, 4 game lists) |
| Game page | Cover, rating, one-tap actions (I own this, Wishlist, Find players, Log a play, Sell, WTB), description in ID/EN, designer, publisher, plays/discussions/posts tabs | Cover, facts, who owns/loves/wants/sells. No actions on the page |
| Matching | Open a "table" for a game, others tap "I'm interested"; wanted board | Automatic from cards (like-minded, play with, buy and sell). Reroll has nothing like it |
| Playing | Play log with winner and scores; logged for everyone at the table; confirmation rule against fake plays | Nothing. Hotness only comes from BGG |
| Events | RSVP, waitlist, add to calendar, weekly repeat, claim an event | Nothing |
| Places | Directory with map, hours, reviews, "this is my place" | Nothing |
| Groups | Group page: events, members, shared collection, plays, wall; "who here owns this?" | One community, no group page |
| Market | Listing page: photo, condition report, price, WhatsApp, book, report, safety note, filters | Sell/buy lines on the card only |
| Table tools | 10 tools, no account needed | None |
| Feed and follow | Feed of people and groups you follow, bell | None |
| Onboarding | "Where to today?" screen, 5-minute play-style quiz, one-page tutorial | None. Sign in drops you on a form |
| Trust | Safety tips, report on everything, help center, terms, privacy, "this is not a shop" notice | None. No privacy policy, though we hold emails |
| Phone | Bottom tab bar with a centre "+" (Feed, Explore, +, Marketplace, Hub) | Top links that wrap |
| Language / theme | EN + ID, light + dark | EN only, light only |
| SEO | 3,472 URLs in a sitemap, JSON-LD, per-page titles | No sitemap, no robots.txt |

## Why ours feels shallow

1. **Phase 1 only.** There is a card and a filter, but nothing that changes the card over time. The loop in the owner's plan (play, log, hotness and badges update, feed post) does not exist yet.
2. **Nothing on the screen shows life.** No members, no recent plays, no events, no photos. Reroll's home is full of live items even though it is small.
3. **Basics are missing:** onboarding, search, report, privacy and terms, phone navigation, notifications.

## What to take, what to skip

Take (fits "people first"):
- One-tap actions on the game page (I own it, Loves it, Want to play, Selling). Biggest gap: people build their card by browsing.
- Play log with the confirmation rule, feeding Hotness, badges and an auto post.
- Tables: a scheduled session with place, date, seats and "I'm in". Reroll's version has no date or place.
- Group shelf search and a "what should we play" picker using the owned lists of whoever is at the table.
- Event page with RSVP and calendar.
- Places directory, tagged on sessions.
- Listing page with photos and a WhatsApp button for trades.
- Play style quiz feeding like-minded matching.
- Safety tips, report, privacy and terms, phone bottom bar with "+".

Skip: auctions, pre-orders, giveaways, blog and news CMS, business organizations, RPG tools, mahjong calculator, a full catalog of 2,600 games.

## Where we can beat them

- Automatic matching between cards. They only have manual tables and a wanted board.
- Hotness from real play history.
- District-level local focus (kecamatan list) instead of national.
- A verified-member badge tied to the community group.
- Hosted by and for one community, so every page can be local and personal.
