// The server entry. It is the framework default plus one thing: a fresh CSP nonce for each page (audit finding H1).
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";
import { newNonce, reportOnlyCsp } from "@/lib/security-headers";

export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") return new Response(null, { status: responseStatusCode, headers: responseHeaders });

  const nonce = newNonce();
  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} nonce={nonce} />, {
    nonce,
    signal: AbortSignal.timeout(streamTimeout + 1000),
    onError(error: unknown) {
      responseStatusCode = 500;
      // Errors from inside the shell are logged by the framework. Errors after the shell is out are logged here.
      if (shellRendered) console.error(error);
    },
  });
  shellRendered = true;

  // Crawlers wait for the whole page.
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) await body.allReady;

  responseHeaders.set("Content-Type", "text/html");
  responseHeaders.set("Content-Security-Policy-Report-Only", reportOnlyCsp(nonce));
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });
}
