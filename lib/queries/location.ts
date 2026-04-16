import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { storeLocation } from "@/lib/db/schema-app"

export async function getLocationByOrganizationId(organizationId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(storeLocation)
    .where(eq(storeLocation.organizationId, organizationId))
    .limit(1)
  return row ?? null
}
