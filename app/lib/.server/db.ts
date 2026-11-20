import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import type { BatchItem } from "drizzle-orm/batch";
import * as schema from "@/db/schema";

export const getDb = () => drizzle(env.DB, { schema });
export type Db = ReturnType<typeof getDb>;

/** One D1 batch. Drizzle wants a tuple that is not empty. This takes a list, and an empty list does nothing. */
export async function runBatch(db: Db, items: BatchItem<"sqlite">[]): Promise<void> {
  if (!items.length) return;
  await db.batch(items as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}
