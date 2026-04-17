import { and, asc, count, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { businessLocation } from "@/lib/db/schema-app"
import { getDefaultLocationSlugForOrganization, listAccessibleBranchesForUser } from "@/lib/queries/location"

/** Resolves `/{businessSlug}/l/{locationSlug}/dashboard` for the signed-in user. */
export async function getDashboardPathForUser(
  userId: string,
  activeOrganizationId?: string | null,
): Promise<string | null> {
  const db = getDb()

  async function pathForMembership(orgId: string, businessSlug: string) {
    const loc = await getDefaultLocationSlugForOrganization(orgId)
    if (!loc) return null
    return `/${businessSlug}/l/${loc}/dashboard`
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

/** True if the user belongs to an organization that has no `location` rows yet. */
export async function hasOrganizationWithoutLocationsForUser(userId: string): Promise<boolean> {
  const db = getDb()
  const orgs = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
  for (const { organizationId } of orgs) {
    const [row] = await db
      .select({ c: count() })
      .from(businessLocation)
      .where(eq(businessLocation.organizationId, organizationId))
    if (Number(row?.c ?? 0) === 0) return true
  }
  return false
}

/**
 * True when the user cannot open a branch dashboard yet and should continue to the
 * `/onboarding` route (no membership yet, or org exists but zero locations).
 */
export async function userNeedsOnboarding(
  userId: string,
  activeOrganizationId: string | null | undefined,
): Promise<boolean> {
  const dashboard = await getDashboardPathForUser(userId, activeOrganizationId)
  if (dashboard) return false
  const memberships = await getMembershipCountForUser(userId)
  if (memberships === 0) return true
  return hasOrganizationWithoutLocationsForUser(userId)
}

/** @deprecated Use `userNeedsOnboarding` */
export const userShouldContinueSetupWizard = userNeedsOnboarding

/** True when the user has more than one accessible branch and should pick one first. */
export async function userNeedsLocationChoice(userId: string): Promise<boolean> {
  const branches = await listAccessibleBranchesForUser(userId)
  return branches.length > 1
}
