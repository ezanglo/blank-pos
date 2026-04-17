import { and, asc, desc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { businessLocation } from "@/lib/db/schema-app"

export async function listLocationsForOrganization(organizationId: string) {
  const db = getDb()
  return db
    .select()
    .from(businessLocation)
    .where(eq(businessLocation.organizationId, organizationId))
    .orderBy(desc(businessLocation.isDefault), asc(businessLocation.createdAt))
}

/** Default branch slug for redirects: `is_default` wins, else oldest row. */
export async function getDefaultLocationSlugForOrganization(
  organizationId: string,
): Promise<string | null> {
  const db = getDb()
  const rows = await db
    .select({ slug: businessLocation.slug })
    .from(businessLocation)
    .where(eq(businessLocation.organizationId, organizationId))
    .orderBy(desc(businessLocation.isDefault), asc(businessLocation.createdAt))
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
    .from(businessLocation)
    .where(
      and(
        eq(businessLocation.organizationId, organizationId),
        eq(businessLocation.slug, locationSlug),
      ),
    )
    .limit(1)
  return row ?? null
}

/** Resolve location for a business slug if the user is a member of that organization. */
export async function getLocationForUserByBusinessAndLocationSlug(
  businessSlug: string,
  locationSlug: string,
  userId: string,
) {
  const db = getDb()
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, businessSlug))
    .limit(1)
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

export type AccessibleBranch = {
  businessSlug: string
  locationSlug: string
  businessName: string
  locationName: string
  organizationId: string
}

/** Every (organization, location) branch the user can open. */
export async function listAccessibleBranchesForUser(userId: string): Promise<AccessibleBranch[]> {
  const db = getDb()
  return db
    .select({
      businessSlug: organization.slug,
      locationSlug: businessLocation.slug,
      businessName: organization.name,
      locationName: businessLocation.name,
      organizationId: organization.id,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .innerJoin(businessLocation, eq(businessLocation.organizationId, organization.id))
    .where(eq(member.userId, userId))
}
