import { env } from "cloudflare:workers";
import { Dices } from "lucide-react";
import { Form, NavLink, Outlet, useRouteLoaderData } from "react-router";
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
          "inline-flex h-11 items-center rounded-lg px-3 text-base text-muted-foreground transition-colors hover:text-foreground",
          isActive && "bg-primary font-bold text-foreground ring-2 ring-ink",
        )
      }
    >
      {children}
    </NavLink>
  );
}

export default function Shell({ loaderData }: Route.ComponentProps) {
  const v = loaderData.viewer;
  return (
    <div className="flex min-h-dvh flex-col">
      {loaderData.sandbox && (
        <div role="note" className="bg-amber-300 px-4 py-2 text-center text-sm font-medium text-black">
          Sandbox: fake data for testing, may be wiped. Sign in with any name@{SANDBOX_DOMAIN} address and code {SANDBOX_CODE}.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          <a href="/" className="mr-auto flex items-center gap-2 py-2 font-display text-lg font-extrabold leading-tight">
            <span aria-hidden className="grid size-9 -rotate-6 place-items-center rounded-lg border-2 border-ink bg-primary shadow-[2px_2px_0_var(--color-ink)]">
              <Dices className="size-5" />
            </span>
            Bekasi Board Game Hub
          </a>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
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
      <footer className="border-t-2 border-ink bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <span>Bekasi Board Game Hub · a community project</span>
          <span>
            Game data from{" "}
            <a className="underline underline-offset-4" href="https://boardgamegeek.com" rel="noreferrer" target="_blank">
              BoardGameGeek
            </a>
          </span>
          {v && (
            <Form method="post" action="/sign-out">
              <button className="underline underline-offset-4" type="submit">Sign out</button>
            </Form>
          )}
        </div>
      </footer>
    </div>
  );
}
