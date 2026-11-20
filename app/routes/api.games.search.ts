import { searchGames } from "@/lib/.server/bgg";
import { requireViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/api.games.search";

export async function loader({ request }: Route.LoaderArgs) {
  await requireViewer(request); // members only: keeps our BGG quota ours
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return Response.json({ hits: await searchGames(q) });
  } catch {
    return Response.json({ hits: [], error: "BoardGameGeek isn't answering. Try again in a minute." }, { status: 502 });
  }
}
