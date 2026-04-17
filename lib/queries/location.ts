import { and, asc, desc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { storeLocation } from "@/lib/db/schema-app"

export async function listLocationsForOrganization(organizationId: string) {
  const db = getDb()
  return db
    .select()
    .from(storeLocation)
    .where(eq(storeLocation.organizationId, organizationId))
    .orderBy(desc(storeLocation.isDefault), asc(storeLocation.createdAt))
}

/** Default branch slug for redirects: `is_default` wins, else oldest row. */
export async function getDefaultLocationSlugForOrganization(
  organizationId: string,
): Promise<string | null> {
  const db = getDb()
  const rows = await db
    .select({ slug: storeLocation.slug })
    .from(storeLocation)
    .where(eq(storeLocation.organizationId, organizationId))
    .orderBy(desc(storeLocation.isDefault), asc(storeLocation.createdAt))
    .limit(1)
  return rows[0]?.slug ?? null
}

export async function getLocationByOrganizationAndSlug(
  organizationId: string,
  locationSlug: string,
) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(storeLocation)
    .where(
      and(eq(storeLocation.organizationId, organizationId), eq(storeLocation.slug, locationSlug)),
    )
    .limit(1)
  return row ?? null
}

/** Resolve location for a store slug if the user is a member of that store. */
export async function getLocationForUserByStoreAndLocationSlug(
  storeSlug: string,
  locationSlug: string,
  userId: string,
) {
  const db = getDb()
  const [org] = await db.select().from(organization).where(eq(organization.slug, storeSlug)).limit(1)
  if (!org) return null

  const [m] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, org.id), eq(member.userId, userId)))
    .limit(1)
  if (!m) return null

  const loc = await getLocationByOrganizationAndSlug(org.id, locationSlug)
  if (!loc) return null

  return { organization: org, member: m, location: loc }
}
