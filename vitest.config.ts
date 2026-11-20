import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Unit tests run in Node. The two cloudflare:* modules are replaced by small stubs, so server code can load.
export default defineConfig({
  resolve: {
    alias: {
      "@": at("./app"),
      "cloudflare:workers": at("./tests/unit/stubs/cloudflare-workers.ts"),
      "cloudflare:sockets": at("./tests/unit/stubs/cloudflare-sockets.ts"),
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
