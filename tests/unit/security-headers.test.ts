import { describe, expect, it } from "vitest";
import { BASIC_HEADERS, ENFORCED_CSP, IMAGE_HOSTS, newNonce, reportOnlyCsp, withBasicHeaders } from "@/lib/security-headers";

const header = (name: string) => BASIC_HEADERS.find(([n]) => n.toLowerCase() === name.toLowerCase())?.[1];

describe("always-on headers", () => {
  it("forbids framing, plugins, and base-tag tricks, and keeps form posts on this site", () => {
    expect(ENFORCED_CSP).toContain("frame-ancestors 'none'");
    expect(ENFORCED_CSP).toContain("object-src 'none'");
    expect(ENFORCED_CSP).toContain("base-uri 'none'");
    expect(ENFORCED_CSP).toContain("form-action 'self'");
  });
  it("sets nosniff, a referrer rule, a permissions rule, and HSTS", () => {
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toMatch(/camera=\(\)/);
    expect(header("Strict-Transport-Security")).toMatch(/^max-age=\d{7,}$/);
  });
  it("does not preload or include subdomains: workers.dev is shared", () => {
    expect(header("Strict-Transport-Security")).not.toMatch(/preload|includeSubDomains/i);
  });
});

describe("report-only policy", () => {
  const csp = reportOnlyCsp("abc123");
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(name + " "));
  it("allows scripts from this site and the nonce, and nothing inline or eval", () => {
    expect(directive("script-src")).toBe("script-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("unsafe-eval");
    expect(directive("script-src")).not.toContain("unsafe-inline");
  });
  it("starts from default-src 'self' and blocks frames and media", () => {
    expect(directive("default-src")).toBe("default-src 'self'");
    expect(directive("frame-src")).toBe("frame-src 'none'");
    expect(directive("media-src")).toBe("media-src 'none'");
  });
  it("lets pictures load from this site, from BoardGameGeek, and from Google", () => {
    for (const host of IMAGE_HOSTS) expect(directive("img-src")).toContain(host);
    expect(directive("img-src")).toContain("'self'");
  });
  it("keeps network calls and workers on this site, and reports to the site", () => {
    expect(directive("connect-src")).toBe("connect-src 'self'");
    expect(directive("worker-src")).toBe("worker-src 'self'");
    expect(directive("report-uri")).toBe("report-uri /api/csp-report");
  });
});

describe("nonce and helper", () => {
  it("makes a fresh nonce each time, in base64", () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(newNonce()).not.toBe(a);
  });
  it("adds the headers and keeps a header the page already set", () => {
    const res = withBasicHeaders(new Response("x", { headers: { "Referrer-Policy": "no-referrer" } }));
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(res.headers.get("Content-Security-Policy")).toBe(ENFORCED_CSP);
  });
});
