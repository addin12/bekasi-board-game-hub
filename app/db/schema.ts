import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

// ---- Better Auth tables (field names are the ones Better Auth expects) ----
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: ts("createdAt").notNull().default(now),
  updatedAt: ts("updatedAt").notNull().default(now),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("createdAt").notNull().default(now),
  updatedAt: ts("updatedAt").notNull().default(now),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_user").on(t.userId)]);

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: ts("accessTokenExpiresAt"),
  refreshTokenExpiresAt: ts("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("createdAt").notNull().default(now),
  updatedAt: ts("updatedAt").notNull().default(now),
}, (t) => [index("account_user").on(t.userId)]);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expiresAt").notNull(),
  createdAt: ts("createdAt").notNull().default(now),
  updatedAt: ts("updatedAt").notNull().default(now),
}, (t) => [index("verification_identifier").on(t.identifier)]);

export const rateLimit = sqliteTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("lastRequest").notNull(),
});

// ---- App tables ----

/** The player card. One row per member, created on first sign-in. */
export const profile = sqliteTable("profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  district: text("district").notNull().default(""),
  bggUsername: text("bgg_username"),
  avatarKey: text("avatar_key"),
  verifiedAt: ts("verified_at"),
  hotSource: text("hot_source", { enum: ["sessions", "bgg_plays", "bgg_hot"] }),
  hotUpdatedAt: ts("hot_updated_at"),
  /** Result of the play-style quiz (a code from app/lib/play-style.ts). Null until the member takes it. */
  playStyle: text("play_style"),
  createdAt: ts("created_at").notNull().default(now),
  updatedAt: ts("updated_at").notNull().default(now),
}, (t) => [index("profile_district").on(t.district)]);

/** BGG game details, cached so pages never wait on BGG. */
export const game = sqliteTable("game", {
  bggId: integer("bgg_id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year"),
  thumbnail: text("thumbnail"),
  image: text("image"),
  minPlayers: integer("min_players"),
  maxPlayers: integer("max_players"),
  playingTime: integer("playing_time"),
  weight: real("weight"),
  fetchedAt: ts("fetched_at").notNull().default(now),
});

export const KINDS = ["favorite", "hot", "want", "own", "sell", "buy"] as const;
export type Kind = (typeof KINDS)[number];

/** Every game on a card: person + game + kind. All filters read this table. */
export const userGame = sqliteTable("user_game", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  bggId: integer("bgg_id").notNull().references(() => game.bggId),
  kind: text("kind", { enum: KINDS }).notNull(),
  position: integer("position").notNull().default(0),
  price: integer("price"), // rupiah, sell/buy only
  condition: text("condition"), // sell only
  note: text("note"),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [
  primaryKey({ columns: [t.userId, t.bggId, t.kind] }),
  index("user_game_game_kind").on(t.bggId, t.kind),
]);

/** Key/value settings an admin changes (e.g. the member passcode hash). */
export const setting = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: ts("updated_at").notNull().default(now),
});

/** Wrong member-passcode tries, for the hourly limit. */
export const passcodeAttempt = sqliteTable("passcode_attempt", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  at: ts("at").notNull().default(now),
}, (t) => [index("passcode_attempt_user_at").on(t.userId, t.at)]);

// ---- Phase 2: places, tables (scheduled sessions), plays, feed, reports, notifications ----

/** A venue members can play at: cafe, shop, community space. Public. */
export const place = sqliteTable("place", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  district: text("district").notNull(),
  address: text("address").notNull().default(""),
  mapUrl: text("map_url"),
  note: text("note").notNull().default(""), // opening hours, table fees, anything useful
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("place_district").on(t.district)]);

export const TABLE_STATUS = ["open", "done", "cancelled"] as const;

/** A table: someone opens a session for a game at a time and place; others join. */
export const playTable = sqliteTable("play_table", {
  id: text("id").primaryKey(),
  hostId: text("host_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  bggId: integer("bgg_id").notNull().references(() => game.bggId),
  placeId: text("place_id").references(() => place.id, { onDelete: "set null" }),
  startsAt: ts("starts_at").notNull(),
  seats: integer("seats").notNull(), // including the host
  note: text("note").notNull().default(""),
  status: text("status", { enum: TABLE_STATUS }).notNull().default("open"),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("play_table_status_start").on(t.status, t.startsAt), index("play_table_host").on(t.hostId)]);

export const tablePlayer = sqliteTable("table_player", {
  tableId: text("table_id").notNull().references(() => playTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [primaryKey({ columns: [t.tableId, t.userId] }), index("table_player_user").on(t.userId)]);

/** A logged play. Counts toward hotness and badges only for players who confirmed it. */
export const play = sqliteTable("play", {
  id: text("id").primaryKey(),
  bggId: integer("bgg_id").notNull().references(() => game.bggId),
  playedOn: text("played_on").notNull(), // YYYY-MM-DD, Jakarta date
  placeId: text("place_id").references(() => place.id, { onDelete: "set null" }),
  tableId: text("table_id").references(() => playTable.id, { onDelete: "set null" }),
  loggedBy: text("logged_by").references(() => user.id, { onDelete: "set null" }),
  durationMin: integer("duration_min"),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("play_game").on(t.bggId), index("play_played_on").on(t.playedOn)]);

export const playPlayer = sqliteTable("play_player", {
  id: text("id").primaryKey(),
  playId: text("play_id").notNull().references(() => play.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // null for a guest
  guestName: text("guest_name"),
  winner: integer("winner", { mode: "boolean" }).notNull().default(false),
  score: integer("score"),
  confirmed: integer("confirmed", { mode: "boolean" }).notNull().default(false),
}, (t) => [index("play_player_play").on(t.playId), index("play_player_user").on(t.userId, t.confirmed)]);

export const POST_KINDS = ["status", "play", "table", "trade"] as const;

export const post = sqliteTable("post", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: POST_KINDS }).notNull(),
  body: text("body").notNull().default(""),
  imageKey: text("image_key"),
  refId: text("ref_id"), // play id, table id, or bgg id for a trade
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("post_created").on(t.createdAt), index("post_user").on(t.userId)]);

export const postLike = sqliteTable("post_like", {
  postId: text("post_id").notNull().references(() => post.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.postId, t.userId] })]);

export const postComment = sqliteTable("post_comment", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => post.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("post_comment_post").on(t.postId, t.createdAt)]);

export const REPORT_TARGETS = ["member", "post", "comment", "table", "place", "play"] as const;

export const report = sqliteTable("report", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").references(() => user.id, { onDelete: "set null" }),
  targetType: text("target_type", { enum: REPORT_TARGETS }).notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["open", "handled"] }).notNull().default("open"),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("report_status").on(t.status, t.createdAt)]);

/** Every admin action, newest last. Nothing in the app edits or deletes these rows. */
export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").references(() => user.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("audit_log_created").on(t.createdAt)]);

export const notification = sqliteTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  href: text("href").notNull(),
  readAt: ts("read_at"),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("notification_user").on(t.userId, t.readAt, t.createdAt)]);

/** One row per phone or browser that turned on push notifications. A member may have several. */
export const pushSubscription = sqliteTable("push_subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: ts("created_at").notNull().default(now),
}, (t) => [index("push_subscription_user").on(t.userId)]);
