import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"
import { getServerEnv } from "../env"

export type AppDatabase = typeof schema

let client: ReturnType<typeof postgres> | null = null
let db: ReturnType<typeof drizzle<AppDatabase>> | null = null

export function getDb() {
  if (db) return db
  const env = getServerEnv()
  client = postgres(env.DATABASE_URL, { prepare: false, max: 10 })
  db = drizzle(client, { schema })
  return db
}

/** For scripts / CLI that need schema without full Next env. */
export function createDb(databaseUrl: string) {
  const c = postgres(databaseUrl, { prepare: false, max: 1 })
  return drizzle(c, { schema })
}

export { schema }
