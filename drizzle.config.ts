import { defineConfig } from "drizzle-kit";

// Generates SQL migrations only; wrangler applies them (`npm run db:migrate:local`).
export default defineConfig({
  dialect: "sqlite",
  schema: "./app/db/schema.ts",
  out: "./drizzle",
});
