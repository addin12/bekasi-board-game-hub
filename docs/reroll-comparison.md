# Reroll.id and Bekasi Board Game Hub (2026-11-18)

## Method

- I read public pages only. I did not sign in. I obeyed robots.txt and waited 2 seconds between requests.
- I read 85 of the 3,472 pages in their sitemap. I read every top-level page and 1 or 2 samples of each page type. One template makes 2,689 of the 3,472 pages (game pages).
- I also read their "How Reroll works" page. It describes the signed-in features that I could not open.
- Raw screenshots and outlines are in `research/raw/reroll/`. They are not in git.

I did not see anything behind sign-in. That includes create-listing, log-a-play, booking, bidding, chat, notifications, and the play-style quiz questions.

## What Reroll is

Reroll is a general board game platform for all of Indonesia. It has these parts:

- A marketplace with listings, bookings, auctions, trade, and a wanted board.
- A catalog of 2,662 games.
- A directory of communities and cafés.
- Events with RSVP.
- Places with reviews.
- A play log with scores.
- Campaigns, a blog and news, votes, pre-orders, and giveaways.
- Table tools: finger chooser, dice, scorepad, counters, "what should we play", and a mahjong calculator.
- A business and organization side, and a Discord bot.
- English and Indonesian, light and dark.

Activity looks thin outside a few accounts. The superadmin profile alone has 22 plays and most of the feed. Its strength is breadth. It is not depth of community.

## Where we stand

| Area | Reroll | Ours at that time |
|---|---|---|
| Person page | Photo, badge ("First Player Token"), followers, following, plays, play style, level and weight, "looking for players" banner, tabs (posts, plays, events, discussions, reviews) | Card only (photo, bio, 4 game lists) |
| Game page | Cover, rating, and one-tap actions (I own this, Wishlist, Find players, Log a play, Sell, WTB). A description in Indonesian and English. Designer, publisher, and tabs for plays, discussions, and posts. | Cover, facts, and who owns, loves, wants, or sells it. No actions on the page. |
| Matching | A member opens a "table" for a game. Others tap "I'm interested". A wanted board. | Automatic from cards (like-minded, play with, buy and sell). Reroll has nothing like it. |
| Playing | Play log with winner and scores. The log shows for everyone at the table. A confirmation rule stops fake plays. | None. Hotness comes only from BGG. |
| Events | RSVP, waitlist, add to calendar, weekly repeat, claim an event | None |
| Places | Directory with map, hours, reviews, "this is my place" | None |
| Groups | Group page with events, members, shared collection, plays, and a wall. "Who here owns this?" | One community and no group page |
| Market | Listing page with photo, condition report, price, WhatsApp, booking, report, and safety note. Filters. | Sell and buy lines on the card only |
| Table tools | 10 tools. No account needed. | None |
| Feed and follow | A feed of the people and groups you follow. A bell. | None |
| Onboarding | "Where to today?" screen, 5-minute play-style quiz, one-page tutorial | None. Sign-in sends you to a form. |
| Trust | Safety tips, report on everything, help center, terms, privacy, "this is not a shop" notice | None. We had no privacy policy, but we hold emails. |
| Phone | Bottom tab bar with a center "+" (Feed, Explore, +, Marketplace, Hub) | Top links that wrap |
| Language and theme | English and Indonesian, light and dark | English only, light only |
| SEO | 3,472 URLs in a sitemap, JSON-LD, a title on each page | No sitemap and no robots.txt |

## Why our site felt shallow

1. **Phase 1 only.** There was a card and a filter. Nothing changed the card over time. The loop in the owner's plan did not exist. That loop is: play, log, hotness and badges update, feed post.
2. **Nothing on the screen showed life.** There were no members, no recent plays, no events, and no photos. The Reroll home page is full of live items, although the site is small.
3. **Basics were missing:** onboarding, search, report, privacy and terms, phone navigation, and notifications.

## What to take and what to skip

Take these. They fit the "people first" goal:

- One-tap actions on the game page (I own it, Loves it, Want to play, Selling). This is the biggest gap. People build their card while they browse.
- A play log with the confirmation rule. It feeds Hotness, badges, and an automatic post.
- Tables: a scheduled session with place, date, seats, and "I'm in". The Reroll version has no date or place.
- A group shelf search. Add a "what should we play" picker that uses the owned lists of the people at the table.
- An event page with RSVP and calendar.
- A places directory. Members tag a place on a session.
- A listing page with photos and a WhatsApp button for trades.
- A play-style quiz that feeds like-minded matching.
- Safety tips, a report button, privacy and terms pages, and a phone bottom bar with "+".

Skip these: auctions, pre-orders, giveaways, a blog and news CMS, business organizations, RPG tools, the mahjong calculator, and a full catalog of 2,600 games.

## Where we can beat them

- We match cards automatically. They have only manual tables and a wanted board.
- We compute Hotness from real play history.
- We focus on local districts (the kecamatan list). They focus on the whole country.
- We give a verified-member badge that ties to the community group.
- One community hosts the site and uses it. Each page can be local and personal.
