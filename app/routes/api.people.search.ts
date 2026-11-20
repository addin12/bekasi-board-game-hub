import { getDb } from "@/lib/.server/db";
import { searchMembers } from "@/lib/.server/plays";
import { requireMember } from "@/lib/.server/viewer";
import type { Route } from "./+types/api.people.search";

export async function loader({ request }: Route.LoaderArgs) {
  const v = await requireMember(request); // members only: this is a directory of people
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const people = await searchMembers(getDb(), q, v.user.id);
  return Response.json({ people: people.map((p) => ({ userId: p.userId, handle: p.handle, displayName: p.displayName, avatar: p.avatar })) });
}
