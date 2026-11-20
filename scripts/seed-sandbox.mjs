// Builds demo data for the SANDBOX site only: fake members (name@sandbox.test) with cards, plus their games from BGG.
// Usage: node scripts/seed-sandbox.mjs  → writes .wrangler/seed-sandbox.sql
//        npx wrangler d1 execute bekasi-bgh-staging --env staging --remote --file .wrangler/seed-sandbox.sql
// Re-running replaces the demo members (ids start with "demo-"); real sign-ups are untouched.
import fs from "node:fs";
import { parseThings } from "../app/lib/bgg-parse.ts";
import { todayWib } from "../app/lib/dates.ts";

const token = fs.readFileSync(".dev.vars", "utf8").match(/^BGG_TOKEN=(.+)$/m)?.[1]?.trim();
if (!token) throw new Error("BGG_TOKEN missing in .dev.vars");

const G = {
  catan: 13, brass: 224517, spirit: 162886, arnak: 312484, crew: 324856, oath: 291572, wingspan: 266192, cascadia: 295947,
  harmonies: 414317, azul: 230802, marvel: 285774, codenames: 178900, splendor: 148228, duel: 173346, ttr: 9209,
};

const MEMBERS = [
  { id: "raka", name: "Raka", district: "Bekasi Barat", verified: true, bio: "Heavy euros on weekends. Happy to teach Brass.",
    favorite: ["brass", "spirit", "arnak"], hot: ["brass", "crew"], want: ["crew", "oath"], own: ["brass", "spirit", "wingspan", "catan"], sell: [["catan", 250000, "Good, all pieces"]], buy: ["oath"] },
  { id: "dinda", name: "Dinda", district: "Jatiasih", verified: true, bio: "Nature games and cozy tile-laying.",
    favorite: ["wingspan", "cascadia", "harmonies"], hot: ["harmonies", "cascadia"], want: ["spirit"], own: ["wingspan", "cascadia", "harmonies", "azul"], sell: [["azul", 300000, "Like new"]], buy: [] },
  { id: "bayu", name: "Bayu", district: "Tambun Selatan", verified: false, bio: "Co-op only. Marvel Champions every Friday.",
    favorite: ["marvel", "spirit", "crew"], hot: ["marvel", "crew"], want: ["brass"], own: ["marvel", "crew", "codenames"], sell: [], buy: ["arnak"] },
  { id: "nadia", name: "Nadia", district: "Cikarang Utara", verified: false, bio: "Quick games after work in Cikarang.",
    favorite: ["azul", "splendor", "duel"], hot: ["duel"], want: ["harmonies", "cascadia"], own: ["splendor", "duel", "ttr"], sell: [["ttr", 400000, "Sleeved"]], buy: [] },
  { id: "fajar", name: "Fajar", district: "Rawalumbu", verified: true, bio: "Looking for a regular Oath group.",
    favorite: ["oath", "brass", "arnak"], hot: ["oath", "arnak"], want: ["marvel"], own: ["oath", "arnak"], sell: [], buy: ["spirit"] },
  { id: "sinta", name: "Sinta", district: "Pondok Gede", verified: false, bio: "Party games and family nights.",
    favorite: ["codenames", "cascadia", "ttr"], hot: ["codenames"], want: ["wingspan"], own: ["codenames"], sell: [], buy: [] },
  { id: "citra", name: "Citra", district: "Bekasi Selatan", verified: true, bio: "Deckbuilders and engine builders. Always up for Spirit Island.",
    favorite: ["spirit", "arnak"], hot: ["arnak"], want: ["brass"], own: ["spirit", "arnak", "azul"], sell: [], buy: [] },
  { id: "eko", name: "Eko", district: "Bekasi Timur", verified: false, bio: "Dad of two. Family-weight games on Sunday afternoons.",
    favorite: ["ttr", "catan", "splendor"], hot: [], want: ["wingspan"], own: ["ttr", "catan"], sell: [["splendor", 200000, "Good, all pieces"]], buy: [] },
  { id: "gita", name: "Gita", district: "Medan Satria", verified: true, bio: "Cozy games and a pot of tea.",
    favorite: ["wingspan", "harmonies", "cascadia"], hot: ["wingspan"], want: ["azul"], own: ["wingspan", "cascadia"], sell: [], buy: ["azul"] },
  { id: "hendra", name: "Hendra", district: "Cibitung", verified: false, bio: "Weeknight quick games after the commute.",
    favorite: ["duel", "codenames", "crew"], hot: ["crew"], want: ["oath"], own: ["duel", "codenames", "crew"], sell: [["codenames", 150000, "Complete"]], buy: [] },
  { id: "indra", name: "Indra", district: "Mustika Jaya", verified: false, bio: "Learning heavy games. Teach me Brass, please.",
    favorite: ["catan", "azul"], hot: [], want: ["brass", "spirit"], own: ["catan"], sell: [], buy: ["brass"] },
  { id: "kirana", name: "Kirana", district: "Tambun Utara", verified: true, bio: "Hosts a game night every month.",
    favorite: ["marvel", "oath", "crew"], hot: ["marvel"], want: ["arnak"], own: ["marvel", "oath", "ttr"], sell: [], buy: [] },
  { id: "lina", name: "Lina", district: "Pondok Melati", verified: false, bio: "Party and word games.",
    favorite: ["codenames", "splendor", "duel"], hot: ["codenames"], want: ["cascadia"], own: ["codenames", "splendor"], sell: [["splendor", 220000, "Like new"]], buy: [] },
  { id: "putra", name: "Putra", district: "Setu", verified: false, bio: "New to the hobby. Started with Catan and wants more.",
    favorite: ["catan"], hot: [], want: ["azul", "ttr"], own: ["catan"], sell: [], buy: [] },
  { id: "admin", name: "Sandbox Admin", district: "Bekasi Utara", verified: true, bio: "Test admin account for the sandbox.",
    favorite: ["catan"], hot: [], want: [], own: [], sell: [], buy: [] },
];

const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?stats=1&id=${Object.values(G).join(",")}`, {
  headers: { authorization: `Bearer ${token}`, "user-agent": "BekasiBoardGameHub/0.1 seed" },
});
if (!res.ok) throw new Error(`BGG ${res.status}`);
const games = parseThings(await res.text());
const missing = Object.entries(G).filter(([, id]) => !games.some((g) => g.bggId === id));
if (missing.length) throw new Error(`BGG did not return: ${missing.map(([k]) => k).join(", ")}`);

const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const now = Date.now();
const sql = [
  "-- Sandbox demo data. Generated by scripts/seed-sandbox.mjs",
  // Phase 2 rows first (plays and places outlive their members), then the members, which cascades the rest.
  "DELETE FROM play WHERE id LIKE 'demo-%';",
  "DELETE FROM play_table WHERE id LIKE 'demo-%';",
  "DELETE FROM place WHERE id LIKE 'demo-%';",
  "DELETE FROM post WHERE id LIKE 'demo-%';",
  "DELETE FROM user WHERE id LIKE 'demo-%';", // cascades to profile, user_game, sessions, notifications
  // Plays that testers logged and whose players were all demo members are left with nobody on them.
  "DELETE FROM post WHERE kind = 'play' AND ref_id IN (SELECT id FROM play WHERE NOT EXISTS (SELECT 1 FROM play_player pp WHERE pp.play_id = play.id));",
  "DELETE FROM play WHERE NOT EXISTS (SELECT 1 FROM play_player pp WHERE pp.play_id = play.id);",
];
for (const g of games) {
  sql.push(`INSERT OR REPLACE INTO game (bgg_id,name,year,thumbnail,image,min_players,max_players,playing_time,weight,fetched_at) VALUES (${[g.bggId, g.name, g.year, g.thumbnail, g.image, g.minPlayers, g.maxPlayers, g.playingTime, g.weight, now].map(q).join(",")});`);
}
for (const m of MEMBERS) {
  const uid = `demo-${m.id}`;
  sql.push(`INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (${[uid, m.name, `${m.id}@sandbox.test`, 1, now, now].map(q).join(",")});`);
  sql.push(`INSERT INTO profile (user_id,handle,display_name,bio,district,verified_at,hot_source,hot_updated_at,created_at,updated_at) VALUES (${[uid, m.id === "admin" ? "sandbox_admin" : m.id, m.name, m.bio, m.district, m.verified ? now : null, m.hot.length ? "sessions" : null, now, now, now].map(q).join(",")});`);
  const rows = [];
  for (const kind of ["favorite", "hot", "want", "own", "buy"]) m[kind].forEach((k, i) => { rows.push([uid, G[k], kind, i, null, null]); });
  m.sell.forEach(([k, price, condition], i) => { rows.push([uid, G[k], "sell", i, price, condition]); });
  for (const r of rows) sql.push(`INSERT INTO user_game (user_id,bgg_id,kind,position,price,condition,created_at) VALUES (${[...r, now].map(q).join(",")});`);
}
// ---- Phase 2 demo data: places, tables, plays, posts, notifications. All clearly fake. ----
const DAY = 86400_000;
const day = (n) => todayWib(now - n * DAY); // n days ago, Jakarta date
const at = (daysFromNow, hh, mm = 0) => { // Jakarta wall-clock time on a day relative to today
  const [y, m, d] = todayWib(now + daysFromNow * DAY).split("-").map(Number);
  return Date.UTC(y, m - 1, d, hh - 7, mm);
};
const PLACES = [
  ["demo-place-1", "Demo Game Cafe", "Bekasi Barat", "Jl. Contoh No. 1", "https://maps.app.goo.gl/demo", "Open 12:00 to 22:00. 6 tables. Fake place for the sandbox."],
  ["demo-place-2", "Demo Community Hall", "Rawalumbu", "Jl. Percobaan No. 2", null, "Weekend playdays. Fake place for the sandbox."],
  ["demo-place-3", "Demo Corner Shop", "Jatiasih", "Jl. Uji Coba No. 3", null, "Shop with two tables. Fake place for the sandbox."],
];
for (const [id, name, district, address, map, note] of PLACES) sql.push(`INSERT INTO place (id,name,district,address,map_url,note,created_by,created_at) VALUES (${[id, name, district, address, map, note, "demo-admin", now].map(q).join(",")});`);

// [id, game, hostMember, daysFromNow, hour, seats, status, place, [members joined]]
const TABLES = [
  ["demo-table-1", "brass", "raka", 2, 19, 4, "open", "demo-place-1", ["raka", "dinda"], "Rules explained. Beginners welcome."],
  ["demo-table-2", "cascadia", "dinda", 4, 14, 3, "open", "demo-place-3", ["dinda", "sinta", "nadia"], ""],
  ["demo-table-3", "azul", "nadia", -1, 16, 4, "done", "demo-place-2", ["nadia", "sinta"], ""],
];
let ts = now - 3 * DAY;
for (const [id, g, host, d, h, seats, status, placeId, joined, note] of TABLES) {
  sql.push(`INSERT INTO play_table (id,host_id,bgg_id,place_id,starts_at,seats,note,status,created_at) VALUES (${[id, `demo-${host}`, G[g], placeId, at(d, h), seats, note, status, ts].map(q).join(",")});`);
  for (const m of joined) sql.push(`INSERT INTO table_player (table_id,user_id,created_at) VALUES (${[id, `demo-${m}`, ts].map(q).join(",")});`);
  sql.push(`INSERT INTO post (id,user_id,kind,body,ref_id,created_at) VALUES (${[`demo-post-${id}`, `demo-${host}`, "table", "", id, ts].map(q).join(",")});`);
  ts += 3600_000 * 5;
}

// [id, game, daysAgo, place, loggedBy, [member, winner, score, confirmed]...]
const PLAYS = [
  ["demo-play-1", "brass", 2, "demo-place-1", "raka", [["raka", 1, 98, 1], ["dinda", 0, 85, 1], ["fajar", 0, 77, 1]]],
  ["demo-play-2", "brass", 9, "demo-place-1", "raka", [["raka", 1, 101, 1], ["fajar", 0, 90, 1]]],
  ["demo-play-3", "crew", 4, "demo-place-2", "bayu", [["raka", 1, null, 1], ["bayu", 1, null, 1], ["nadia", 1, null, 1]]],
  ["demo-play-4", "oath", 6, "demo-place-2", "fajar", [["fajar", 1, null, 1], ["raka", 0, null, 1]]],
  ["demo-play-5", "harmonies", 3, "demo-place-3", "dinda", [["dinda", 1, 71, 1], ["nadia", 0, 64, 1], ["sinta", 0, 60, 1]]],
  ["demo-play-6", "wingspan", 12, "demo-place-3", "dinda", [["dinda", 1, 88, 1], ["raka", 0, 70, 0]]], // raka has not confirmed this one
  ["demo-play-7", "azul", 1, "demo-place-2", "nadia", [["nadia", 1, 62, 1], ["sinta", 0, 55, 1]]],
];
let n = 0;
for (const [id, g, ago, placeId, by, players] of PLAYS) {
  sql.push(`INSERT INTO play (id,bgg_id,played_on,place_id,logged_by,duration_min,created_at) VALUES (${[id, G[g], day(ago), placeId, `demo-${by}`, 60 + ago * 5, now - ago * DAY].map(q).join(",")});`);
  for (const [m, w, score, conf] of players) sql.push(`INSERT INTO play_player (id,play_id,user_id,winner,score,confirmed) VALUES (${[`demo-pp-${++n}`, id, `demo-${m}`, w, score, conf].map(q).join(",")});`);
  sql.push(`INSERT INTO post (id,user_id,kind,body,ref_id,created_at) VALUES (${[`demo-post-${id}`, `demo-${by}`, "play", "", id, now - ago * DAY].map(q).join(",")});`);
}
sql.push(`INSERT INTO play_player (id,play_id,guest_name,winner,score,confirmed) VALUES ('demo-pp-guest','demo-play-1','Budi (guest)',0,60,1);`);

const STATUS = [
  ["demo-post-s1", "dinda", "Anyone up for Wingspan this weekend? I can bring the Oceania expansion too.", 5],
  ["demo-post-s2", "bayu", "Looking for a 4th for Marvel Champions on Friday night. Co-op only, snacks provided.", 30],
];
for (const [id, who, body, hoursAgo] of STATUS) sql.push(`INSERT INTO post (id,user_id,kind,body,created_at) VALUES (${[id, `demo-${who}`, "status", body, now - hoursAgo * 3600_000].map(q).join(",")});`);
sql.push(`INSERT INTO post (id,user_id,kind,body,ref_id,created_at) VALUES (${["demo-post-t1", "demo-nadia", "trade", "is selling Ticket to Ride for Rp 400.000", String(G.ttr), now - 20 * 3600_000].map(q).join(",")});`);
sql.push(`INSERT INTO post_comment (id,post_id,user_id,body,created_at) VALUES ('demo-comment-1','demo-post-s2','demo-raka','I can join if it is Marvel Champions with the Ant-Man pack.',${now - 28 * 3600_000});`);
sql.push(`INSERT INTO post_like (post_id,user_id) VALUES ('demo-post-s1','demo-raka'),('demo-post-s1','demo-nadia'),('demo-post-s2','demo-fajar');`);
sql.push(`INSERT INTO notification (id,user_id,text,href,read_at,created_at) VALUES ('demo-n1','demo-raka','Dinda joined your Brass: Birmingham table.','/tables/demo-table-1',NULL,${now - 2 * 3600_000});`);
sql.push(`INSERT INTO notification (id,user_id,text,href,read_at,created_at) VALUES ('demo-n2','demo-raka','Dinda added you to a Wingspan play. Confirm it or remove yourself.','/plays/demo-play-6',NULL,${now - 12 * DAY});`);

fs.mkdirSync(".wrangler", { recursive: true });
fs.writeFileSync(".wrangler/seed-sandbox.sql", sql.join("\n") + "\n");
console.log(`games: ${games.map((g) => g.name).join(", ")}`);
console.log(`wrote .wrangler/seed-sandbox.sql (${MEMBERS.length} members, ${sql.length} statements)`);
