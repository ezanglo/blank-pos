import { and, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member } from "@/lib/db/schema"
import { storeBranding } from "@/lib/db/schema-app"

export const STORE_BRANDING_ID = "default" as const

export async function getStoreBranding() {
  const db = getDb()
  const [row] = await db
    .select()
    .from(storeBranding)
    .where(eq(storeBranding.id, STORE_BRANDING_ID))
    .limit(1)
  return row ?? null
}

/** Owner or manager of any org may edit shared store branding. */
export async function userCanEditStoreBranding(userId: string): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), inArray(member.role, ["owner", "manager"])))
    .limit(1)
  return !!row
}
