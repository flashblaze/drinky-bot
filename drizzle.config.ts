import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// https://github.com/neondatabase-labs/cloudflare-drizzle-neon/blob/main/migrate.ts
config({ path: ".dev.vars" });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
