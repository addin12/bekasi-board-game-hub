import { Link } from "react-router";
import { PlayerCard } from "@/components/player-card";
import { ShareButtons } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { loadCard } from "@/lib/.server/cards";
import { getDb } from "@/lib/.server/db";
import { getViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/p.$handle";

export async function loader({ request, params }: Route.LoaderArgs) {
  const card = await loadCard(getDb(), { handle: params.handle.toLowerCase() });
  if (!card) throw new Response("Not found", { status: 404 });
  const v = await getViewer(request);
  const origin = new URL(request.url).origin;
  const image = card.person.avatar ?? card.favorite[0]?.thumbnail ?? null;
  return { card, isMe: v?.user.id === card.person.userId, ogImage: image ? new URL(image, origin).toString() : null, url: `${origin}/p/${card.person.handle}` };
}

// Public page: these tags make the WhatsApp / Instagram link preview.
export const meta = ({ loaderData: data }: Route.MetaArgs) => {
  if (!data) return [{ title: "Player not found · Bekasi Board Game Hub" }];
  const { card } = data;
  const title = `${card.person.displayName} · Bekasi Board Game Hub`;
  const favs = card.favorite.map((g) => g.name).join(", ");
  const description = favs ? `Favorites: ${favs}. Plays around ${card.person.district}.` : `Board gamer in ${card.person.district}.`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: data.url },
    { property: "og:type", content: "profile" },
    ...(data.ogImage ? [{ property: "og:image", content: data.ogImage }] : []),
  ];
};

export default function PlayerPage({ loaderData }: Route.ComponentProps) {
  const { card, isMe } = loaderData;
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className="flex flex-wrap justify-between gap-2">
        <ShareButtons title={`${card.person.displayName}'s player card`} path={`/p/${card.person.handle}`} />
        {isMe && <Button asChild><Link to="/me/edit">Edit my card</Link></Button>}
      </div>
      <PlayerCard card={card} />
    </div>
  );
}
