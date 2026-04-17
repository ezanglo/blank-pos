import { and, asc, count, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { storeLocation } from "@/lib/db/schema-app"
import { getDefaultLocationSlugForOrganization } from "@/lib/queries/location"

/** Resolves `/{storeSlug}/l/{locationSlug}/dashboard` for the signed-in user. */
export async function getDashboardPathForUser(
  userId: string,
  activeOrganizationId?: string | null,
): Promise<string | null> {
  const db = getDb()

  async function pathForMembership(orgId: string, storeSlug: string) {
    const loc = await getDefaultLocationSlugForOrganization(orgId)
    if (!loc) return null
    return `/${storeSlug}/l/${loc}/dashboard`
  }

  if (activeOrganizationId) {
    const [row] = await db
      .select({ slug: organization.slug, id: organization.id })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(and(eq(member.userId, userId), eq(organization.id, activeOrganizationId)))
      .limit(1)
    if (row) {
      const p = await pathForMembership(row.id, row.slug)
      if (p) return p
    }
  }

  const [row] = await db
    .select({ slug: organization.slug, id: organization.id })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1)

  if (!row) return null
  return pathForMembership(row.id, row.slug)
}

export async function getMembershipCountForUser(userId: string): Promise<number> {
  const db = getDb()
  const [row] = await db
    .select({ c: count() })
    .from(member)
    .where(eq(member.userId, userId))
  return Number(row?.c ?? 0)
}

/** True if the user belongs to a store that has no `location` rows yet. */
export async function hasOrganizationWithoutLocationsForUser(userId: string): Promise<boolean> {
  const db = getDb()
  const orgs = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
  for (const { organizationId } of orgs) {
    const [row] = await db
      .select({ c: count() })
      .from(storeLocation)
      .where(eq(storeLocation.organizationId, organizationId))
    if (Number(row?.c ?? 0) === 0) return true
  }
  return false
}

/**
 * True when the user cannot open a branch dashboard yet but should stay on `/setup`
 * (after bootstrap owner, or after creating a store before the first location).
 */
export async function userShouldContinueSetupWizard(
  userId: string,
  activeOrganizationId: string | null | undefined,
): Promise<boolean> {
  const dashboard = await getDashboardPathForUser(userId, activeOrganizationId)
  if (dashboard) return false
  const memberships = await getMembershipCountForUser(userId)
  if (memberships === 0) return true
  return hasOrganizationWithoutLocationsForUser(userId)
}
