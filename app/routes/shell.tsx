import { env } from "cloudflare:workers";
import { Form, NavLink, Outlet, useNavigation, useRouteLoaderData } from "react-router";
import { isSandboxOn, SANDBOX_CODE, SANDBOX_DOMAIN } from "@/lib/sandbox";
import { cn } from "@/lib/utils";
import { getViewer } from "@/lib/.server/viewer";
import type { Route } from "./+types/shell";

export async function loader({ request }: Route.LoaderArgs) {
  const v = await getViewer(request);
  return { viewer: v ? { handle: v.profile?.handle ?? null, isAdmin: v.isAdmin } : null, sandbox: isSandboxOn(env.SANDBOX) };
}

export const useShell = () => useRouteLoaderData<typeof loader>("routes/shell");

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "inline-flex h-11 items-center border-b-4 px-2 text-base font-semibold transition-colors",
          isActive ? "border-brand text-ink" : "border-transparent text-muted-foreground hover:text-ink",
        )
      }
    >
      {children}
    </NavLink>
  );
}

/** Loading state for every page change and form (R-27): a thin orange bar at the top while the next page loads. */
function PendingBar() {
  const busy = useNavigation().state !== "idle";
  return (
    <div aria-hidden className={cn("fixed inset-x-0 top-0 z-50 h-1 origin-left bg-brand transition-transform duration-500", busy ? "scale-x-75" : "scale-x-0 duration-0")} />
  );
}

export default function Shell({ loaderData }: Route.ComponentProps) {
  const v = loaderData.viewer;
  const busy = useNavigation().state !== "idle";
  return (
    <div className="flex min-h-dvh flex-col" aria-busy={busy}>
      <PendingBar />
      {loaderData.sandbox && (
        <div role="note" className="bg-amber-300 px-4 py-2 text-center text-sm font-semibold text-ink">
          Sandbox: fake data for testing, may be wiped. Sign in with any name@{SANDBOX_DOMAIN} address and code {SANDBOX_CODE}.
        </div>
      )}
      <header className="border-b-2 border-ink bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-6 gap-y-1 px-4 pt-3">
          {/* Text wordmark until the community has a real logo (R-23). */}
          <a href="/" className="mb-1.5 inline-flex min-h-11 items-center text-lg font-extrabold uppercase leading-tight tracking-tight">
            Bekasi Board Game Hub
          </a>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-x-3">
            {v ? (
              <>
                <Tab to="/find">Find</Tab>
                <Tab to={v.handle ? `/p/${v.handle}` : "/me/edit"}>My card</Tab>
                <Tab to="/settings">Settings</Tab>
                {v.isAdmin && <Tab to="/admin">Admin</Tab>}
              </>
            ) : (
              <Tab to="/sign-in">Sign in</Tab>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <p>Run by and for the Bekasi board game community.</p>
          <p>
            Game data from{" "}
            <a className="font-semibold text-ink underline underline-offset-4" href="https://boardgamegeek.com" rel="noreferrer" target="_blank">
              BoardGameGeek
            </a>
          </p>
          {v && (
            <Form method="post" action="/sign-out">
              <button className="inline-flex h-11 items-center font-semibold text-ink underline underline-offset-4" type="submit">Sign out</button>
            </Form>
          )}
        </div>
      </footer>
    </div>
  );
}
