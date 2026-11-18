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
