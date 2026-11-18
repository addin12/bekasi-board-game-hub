# Owner brainstorm (2026-11-18)

Sketches: [player-card.png](player-card.png), [flow.png](flow.png)

## Original notes (Indonesian, verbatim)

Jadi main idea-nya ini. Player card (data).
Di dalamnya ada location, bg favorites/hotness, bg yang mau dimainin, wtb/wts (masih bingung alurnya)

Nanti si web app-nya buat filtered sesuai preferensi.
Cari orang yang punya/mau main game yang kita mau main (seperti yang ada di card). Atau yang sama sama suka main game tertentu. Atau yang punya/mau jual bg yang kita mau.

Feed atau post nya model X (dulu dikenal sebagai twitter) atau threads, tapi sederhana aja. At least bisa ngepost gambar (ada komen/like button). dan juga bisa post status tapi auto generated gitu. si X main game Anu sama si Y dan Z

Si M menjual board game Inu ke si X

Kalau bisa kita ngangkat tempat juga.
Jadi sistem loging game nya geo location, ada tag tempat nya

Atau perlu ada kayak gini, biar bisa dilihat public (tanpa regis)

Intinya sih filter database (dari player data/card yang ada)

Oh. Misalnya kita click satu game.
Keliatan tuh, siapa yang punya, siapa yang suka, siapa yang jual

Tujuannya sih:
* Ketemuin pemain yang punya kesenangan yang sama
* Yang punya game ketemu yang mau main gamenya (atau vice versa)
* Nambah database untuk tempat yang bisa disinggahi buat main board game
* Gamefy the game session (masih dipikirin nih)

Ini kalau bisa ada tombol share ke social media gitu ok juga.
Jadi ada traffic / exposure dari non member

perlu ada verification badge per profile gitu kah kalo udah part of WAG member dengan kirim passcode
di laman user setting ada isian passcode
ada session scheduler

last but not least, push notification
kalau ke invite, ada yang join di sesi yang di post, atau kalau ke tag di post

## Decisions so far
- Folder: `D:\TTRPG\Board Game Hub`
- Language: English first, Indonesian later
- Scraping: whatever is convenient (no Firecrawl key → local headless Chrome via Playwright)
- BGG: owner has API access; never scrape BGG
