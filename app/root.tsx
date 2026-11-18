import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import { Toaster } from "@/components/ui/sonner";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // One light "game night table" theme on purpose.
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fff8ee" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh bg-background text-base text-foreground antialiased">
        {children}
        <Toaster position="top-center" />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let details = "Please try again in a moment.";
  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    details = error.status === 404 ? "This link doesn't lead anywhere. Check the address or go back home." : error.data || error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }
  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{details}</p>
      <a className="underline underline-offset-4" href="/">Go to the home page</a>
    </main>
  );
}
