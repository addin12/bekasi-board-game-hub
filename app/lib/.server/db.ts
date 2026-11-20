import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import type { BatchItem } from "drizzle-orm/batch";
import * as schema from "@/db/schema";

export const getDb = () => drizzle(env.DB, { schema });
export type Db = ReturnType<typeof getDb>;

/** D1 allows 100 bound values in one query, so a long id list goes in parts of 90. Use it around every `inArray` whose list can grow with the community. */
export async function inParts<T, R>(ids: T[], run: (part: T[]) => Promise<R[]>): Promise<R[]> {
  const parts: T[][] = [];
  for (let i = 0; i < ids.length; i += 90) parts.push(ids.slice(i, i + 90));
  return (await Promise.all(parts.map(run))).flat();
}

/** One D1 batch. Drizzle wants a tuple that is not empty. This takes a list, and an empty list does nothing. */
export async function runBatch(db: Db, items: BatchItem<"sqlite">[]): Promise<void> {
  if (!items.length) return;
  await db.batch(items as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}
