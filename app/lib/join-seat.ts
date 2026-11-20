import { sql } from "drizzle-orm";

/** The one statement that seats a player. It inserts only while fewer than `seats` players sit, so two people cannot take the last seat. */
export const joinSeatSql = (tableId: string, userId: string, seats: number) => sql`INSERT OR IGNORE INTO table_player (table_id, user_id)
    SELECT ${tableId}, ${userId} WHERE (SELECT COUNT(*) FROM table_player WHERE table_id = ${tableId}) < ${seats}`;
