import { redirect } from "react-router";
import { getAuth } from "@/lib/.server/auth";
import type { Route } from "./+types/sign-out";

export async function action({ request }: Route.ActionArgs) {
  const res = await getAuth().api.signOut({ headers: request.headers, asResponse: true });
  const headers = new Headers();
  for (const c of res.headers.getSetCookie()) headers.append("set-cookie", c);
  return redirect("/", { headers });
}
export const loader = () => redirect("/");
