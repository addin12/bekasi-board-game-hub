import { NavLink, Outlet } from "react-router";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/lib/.server/viewer";
import type { Route } from "./+types/admin";

export const meta = () => [{ title: "Admin · Bekasi Board Game Hub" }];

// Layout for the back office. Child routes check admin rights again themselves: a client-side move between
// children does not re-run this loader, and actions never go through it.
export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

const TABS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/members", label: "Members" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/site", label: "Site" },
  { to: "/admin/log", label: "Log" },
];

export default function AdminLayout() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <nav aria-label="Admin sections" className="flex flex-wrap gap-x-1 border-b-2 border-line">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => cn("-mb-0.5 inline-flex h-12 items-center border-b-4 px-3 text-base font-semibold", isActive ? "border-brand font-bold text-ink" : "border-transparent text-muted-foreground hover:text-ink")}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
