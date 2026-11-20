import { env } from "cloudflare:workers";
import { Bell, CalendarDays, Newspaper, Search, UserRound, Users } from "lucide-react";
import { Form, Link, NavLink, Outlet, useLocation, useNavigation, useRouteLoaderData } from "react-router";
import { CreateMenu } from "@/components/create-menu";
import { isSandboxOn, SANDBOX_CODE, SANDBOX_DOMAIN } from "@/lib/sandbox";
import { cn } from "@/lib/utils";
import { loadSiteText } from "@/lib/.server/admin";
import { unreadCount } from "@/lib/.server/common";
import { getDb } from "@/lib/.server/db";
import { getViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/shell";

export async function loader({ request }: Route.LoaderArgs) {
  const v = await getViewer(request);
  const db = getDb();
  const [unread, site] = await Promise.all([v?.profile ? unreadCount(db, v.user.id) : Promise.resolve(0), loadSiteText(db)]);
  return {
    viewer: v ? { handle: v.profile?.handle ?? null, isAdmin: v.isAdmin } : null,
    unread,
    site, // admin-editable text: banner, footer line, home text, contact line
    sandbox: isSandboxOn(env.SANDBOX),
  };
}

export const useShell = () => useRouteLoaderData<typeof loader>("routes/shell");

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn("inline-flex h-11 items-center border-b-4 px-2 text-base font-semibold transition-colors", isActive ? "border-brand text-ink" : "border-transparent text-muted-foreground hover:text-ink")
      }
    >
      {children}
    </NavLink>
  );
}

/** Loading state for every page change and form (R-27): a thin orange bar at the top while the next page loads. */
function PendingBar() {
  const busy = useNavigation().state !== "idle";
  return <div aria-hidden className={cn("fixed inset-x-0 top-0 z-50 h-1 origin-left bg-brand transition-transform duration-500", busy ? "scale-x-75" : "scale-x-0 duration-0")} />;
}

function BarItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof Newspaper; active?: boolean }) {
  return (
    <NavLink to={to} aria-current={active ? "page" : undefined} className={({ isActive }) => cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold", (active ?? isActive) ? "text-ink" : "text-muted-foreground")}>
      {({ isActive }) => (
        <>
          <Icon className="icon" aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function Shell({ loaderData }: Route.ComponentProps) {
  const { viewer: v, unread, site } = loaderData;
  const busy = useNavigation().state !== "idle";
  const { pathname } = useLocation();
  const member = Boolean(v?.handle);
  const meetActive = pathname.startsWith("/tables") || pathname.startsWith("/places");
  return (
    <div className="flex min-h-dvh flex-col" aria-busy={busy}>
      <PendingBar />
      <header className="border-b-2 border-ink bg-card pt-[env(safe-area-inset-top)]">
        {loaderData.sandbox && (
          <div role="note" className="bg-amber-300 px-4 py-2 text-center text-sm font-semibold text-ink">
            Sandbox: fake data for testing, may be wiped. Sign in with any name@{SANDBOX_DOMAIN} address and code {SANDBOX_CODE}.
          </div>
        )}
        {site.banner && <div role="note" className="bg-ink px-4 py-2 text-center text-sm font-semibold text-white">{site.banner}</div>}
        <div className={cn("mx-auto flex max-w-5xl items-end justify-between gap-x-3 gap-y-1 px-4 pt-3 sm:gap-x-6", member ? "flex-nowrap md:flex-wrap" : "flex-wrap")}>
          {/* Text wordmark until the community has a real logo (R-23). */}
          <a href="/" className="mb-2 inline-flex min-h-11 min-w-0 items-center text-base font-extrabold uppercase leading-tight sm:text-lg">
            Bekasi Board Game Hub
          </a>
          {/* Members: icons stay on one row beside the title even at 320px; the title wraps instead. */}
          <nav aria-label="Main" className={cn("flex items-center", member ? "shrink-0 flex-nowrap gap-x-1 md:gap-x-3" : "flex-wrap gap-x-3")}>
            {member ? (
              <>
                {/* Phone uses the bottom bar for these. */}
                <span className="hidden items-center gap-x-3 md:flex">
                  <Tab to="/feed">Feed</Tab>
                  <Tab to="/find">Find</Tab>
                  <Tab to="/tables">Tables</Tab>
                  <Tab to="/places">Places</Tab>
                  <Tab to={`/p/${v!.handle}`}>My card</Tab>
                  <Tab to="/settings">Settings</Tab>
                  {v!.isAdmin && <Tab to="/admin">Admin</Tab>}
                </span>
                <Link to="/search" className="inline-flex size-11 items-center justify-center" aria-label="Search"><Search className="icon" aria-hidden /></Link>
                <Link to="/notifications" className="relative inline-flex size-11 items-center justify-center" aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}>
                  <Bell className="icon" aria-hidden />
                  {unread > 0 && <span aria-hidden className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full border-2 border-ink bg-brand px-1 text-xs font-extrabold leading-4 text-ink tabular-nums">{unread > 9 ? "9+" : unread}</span>}
                </Link>
                <span className="mb-1 ml-1 hidden md:block"><CreateMenu variant="header" /></span>
              </>
            ) : v ? (
              <Tab to="/me/edit">Make my card</Tab>
            ) : (
              <>
                <Tab to="/places">Places</Tab>
                <Tab to="/sign-in">Sign in</Tab>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className={cn("mx-auto w-full max-w-5xl flex-1 px-4 py-8", member && "pb-28 md:pb-8")}>
        <Outlet />
      </main>

      <footer className={cn("border-t border-line", member && "pb-20 md:pb-0")}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-5 text-sm text-muted-foreground">
          <p>{site.footer}</p>
          <nav aria-label="About" className="flex flex-wrap items-center gap-x-4">
            <Link className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4" to="/privacy">Privacy</Link>
            <Link className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4" to="/terms">Terms</Link>
            <Link className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4" to="/safety">Safety tips</Link>
            <a className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4" href="https://boardgamegeek.com" rel="noreferrer" target="_blank">Game data: BoardGameGeek</a>
            {member && <Link className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4 md:hidden" to="/settings">Settings</Link>}
            {v?.isAdmin && <Link className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4 md:hidden" to="/admin">Admin</Link>}
            {v && (
              <Form method="post" action="/sign-out">
                <button className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4" type="submit">Sign out</button>
              </Form>
            )}
          </nav>
        </div>
      </footer>

      {member && (
        <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2">
            <BarItem to="/feed" label="Feed" icon={Newspaper} />
            <BarItem to="/find" label="Find" icon={Users} />
            <div className="flex justify-center"><CreateMenu variant="bar" /></div>
            <BarItem to="/tables" label="Tables" icon={CalendarDays} active={meetActive} />
            <BarItem to={`/p/${v!.handle}`} label="My card" icon={UserRound} />
          </div>
        </nav>
      )}
    </div>
  );
}
