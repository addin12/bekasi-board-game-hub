// Browser security headers (audit finding H1). Pure functions, so a unit test can pin them.
//   - Always on (every response, workers/app.ts): nosniff, referrer, permissions, HSTS, and an enforced CSP with the directives that cannot break a page.
//   - Report only (page responses, app/entry.server.tsx): the full script, style, image, and connect rules with a fresh nonce.
//     The browser reports a violation to /api/csp-report and still loads the page. Enforce this policy after the reports stay empty.

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

/** The strict policy. It has no 'unsafe-inline' and no 'unsafe-eval' for scripts. Inline scripts need the per-response nonce. */
export function reportOnlyCsp(nonce: string): string {
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
  ].join("; ");
}

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
