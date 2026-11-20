// Stand-in for the "cloudflare:workers" module in unit tests. A test sets the fields it needs on `env`.
export const env: Record<string, unknown> = {};
export const waitUntil = (_p: Promise<unknown>) => {};
