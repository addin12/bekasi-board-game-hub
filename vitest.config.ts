import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for pure modules only (no Workers runtime needed).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./app", import.meta.url)) } },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
