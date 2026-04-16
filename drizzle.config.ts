import { config as loadEnv } from "dotenv"
import { defineConfig } from "drizzle-kit"

// drizzle-kit does not load Next.js env files; mirror typical Next load order.
loadEnv({ path: ".env" })
loadEnv({ path: ".env.local" })

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
