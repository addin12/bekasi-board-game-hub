import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // Resource routes (no UI)
  route("api/auth/*", "routes/api.auth.ts"),
  route("api/games/search", "routes/api.games.search.ts"),
  route("img/*", "routes/img.ts"),
  route("sign-out", "routes/sign-out.ts"),

  layout("routes/shell.tsx", [
    index("routes/home.tsx"),
    route("sign-in", "routes/sign-in.tsx"),
    route("find", "routes/find.tsx"),
    route("me/edit", "routes/me.edit.tsx"),
    route("p/:handle", "routes/p.$handle.tsx"),
    route("g/:bggId", "routes/g.$bggId.tsx"),
    route("settings", "routes/settings.tsx"),
    route("admin", "routes/admin.tsx"),
  ]),
] satisfies RouteConfig;
