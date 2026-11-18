import { getAuth } from "@/lib/.server/auth";
import type { Route } from "./+types/api.auth";

// Better Auth owns everything under /api/auth/*.
export const loader = ({ request }: Route.LoaderArgs) => getAuth().handler(request);
export const action = ({ request }: Route.ActionArgs) => getAuth().handler(request);
