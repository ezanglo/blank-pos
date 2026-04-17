import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { getServerEnv } from "../env"
import * as schema from "./schema"

export type AppDatabase = typeof schema

/**
 * Next.js dev HMR reloads modules; module-level `let` would create new pools while old
 * `postgres()` clients still hold DB connections until GC → "max client connections" errors.
 * Reuse one pool per Node process via `globalThis`.
 */
const globalForDb = globalThis as unknown as {
  blankPosDrizzle?: ReturnType<typeof drizzle<AppDatabase>>
}

export function getDb() {
  if (globalForDb.blankPosDrizzle) return globalForDb.blankPosDrizzle
  const env = getServerEnv()
  const max = process.env.NODE_ENV === "production" ? 10 : 5
  const client = postgres(env.DATABASE_URL, {
    prepare: false,
    max,
    idle_timeout: 30,
  })
  globalForDb.blankPosDrizzle = drizzle(client, { schema })
  return globalForDb.blankPosDrizzle
}

/** For scripts / CLI that need schema without full Next env. */
export function createDb(databaseUrl: string) {
  const c = postgres(databaseUrl, { prepare: false, max: 1 })
  return drizzle(c, { schema })
}

export { schema }
