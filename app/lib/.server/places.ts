import { and, asc, count, desc, eq, gt, sql } from "drizzle-orm";
import type { z } from "zod";
import { game, place, play } from "@/db/schema";
import type { placeSchema } from "@/lib/validate";
import { LIMIT_MSG, newId, type Result } from "./common";
import type { Db } from "./db";
import { listTables } from "./tables";

export type PlaceInput = z.infer<typeof placeSchema>;

export async function createPlace(db: Db, userId: string, input: PlaceInput): Promise<Result<{ id: string }>> {
  const [{ n }] = await db.select({ n: count() }).from(place).where(and(eq(place.createdBy, userId), gt(place.createdAt, new Date(Date.now() - 86400_000))));
  if (n >= 5) return { ok: false, message: LIMIT_MSG };
  const [dup] = await db.select({ id: place.id }).from(place)
    .where(and(sql`lower(${place.name}) = lower(${input.name})`, eq(place.district, input.district))).limit(1);
  if (dup) return { ok: false, message: `${input.name} is already listed in ${input.district}. Look for it in Places.` };
  const id = newId();
  await db.insert(place).values({ id, name: input.name, district: input.district, address: input.address, mapUrl: input.mapUrl, note: input.note, createdBy: userId });
  return { ok: true, id };
}

export async function listPlaces(db: Db, district?: string | null) {
  return db
    .select({
      id: place.id, name: place.name, district: place.district, address: place.address, mapUrl: place.mapUrl,
      plays: sql<number>`(SELECT COUNT(*) FROM play p WHERE p.place_id = ${place.id})`,
    })
    .from(place)
    .where(district ? eq(place.district, district) : undefined)
    .orderBy(asc(place.district), asc(place.name));
}

export async function loadPlace(db: Db, id: string) {
  const [p] = await db.select().from(place).where(eq(place.id, id)).limit(1);
  if (!p) return null;
  const tables = await listTables(db, { placeId: id, limit: 10 });
  const recent = await db
    .select({ id: play.id, gameName: game.name, playedOn: play.playedOn })
    .from(play).innerJoin(game, eq(game.bggId, play.bggId))
    .where(eq(play.placeId, id)).orderBy(desc(play.playedOn)).limit(5);
  return { place: p, tables, recent };
}
