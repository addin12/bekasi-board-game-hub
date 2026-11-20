// Browser security headers (audit finding H1). Pure functions, so a unit test can pin them.
//   - Always on (every response, workers/app.ts): nosniff, referrer, permissions, HSTS, and a small enforced CSP.
//   - Page responses (app/entry.server.tsx): the full CSP with a fresh nonce. It is enforced. Setting CSP_MODE=report-only sends it as
//     report-only instead (the browser reports to /api/csp-report and still loads the page). That is the quick way back if a rule breaks a page.

/** Directives that cannot break a working page: no framing, no plugins, no <base> tricks, forms post to this site only. */
export const ENFORCED_CSP = "frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'";

export const BASIC_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"],
  // No includeSubDomains and no preload: workers.dev is shared with other people's sites.
  ["Strict-Transport-Security", "max-age=31536000"],
  ["Content-Security-Policy", ENFORCED_CSP],
];

/** Hosts that serve pictures: BoardGameGeek covers and Google profile pictures. Our own pictures come from this site (/img). */
export const IMAGE_HOSTS = ["https://cf.geekdo-images.com", "https://*.geekdo-images.com", "https://*.googleusercontent.com"] as const;

/** The full policy for a page. It has no 'unsafe-inline' and no 'unsafe-eval' for scripts. Inline scripts need the per-response nonce. */
export function pageCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'", // React sets style attributes, and the toast library adds a style tag
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-src 'none'",
    "media-src 'none'",
    "report-uri /api/csp-report",
    ENFORCED_CSP, // the same four rules as the small policy: no framing, no plugins, no base tag, forms to this site
  ].join("; ");
}

/** The header name for the page policy: enforced, or report-only when CSP_MODE says so. */
export const cspHeaderName = (mode: string | undefined): string => (mode === "report-only" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy");

/** A fresh nonce for each page response. 16 random bytes, base64. */
export function newNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

/** Adds the always-on headers. A header the page already set is kept. */
export function withBasicHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [name, value] of BASIC_HEADERS) if (!out.headers.has(name)) out.headers.set(name, value);
  return out;
}
