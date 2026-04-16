import { count } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { user } from "@/lib/db/schema"

export async function getUserCount(): Promise<number> {
  const db = getDb()
  const [row] = await db.select({ c: count() }).from(user)
  return Number(row?.c ?? 0)
}
