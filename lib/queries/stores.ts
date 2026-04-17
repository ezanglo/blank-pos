import { and, asc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { businessDetails } from "@/lib/db/schema-app"

export type BusinessSummaryForUser = {
  organizationId: string
  name: string
  slug: string
  role: string
  brandingDisplayName: string | null
  logoImageUrl: string | null
}

export async function listBusinessesForUser(userId: string): Promise<BusinessSummaryForUser[]> {
  const db = getDb()
  const rows = await db
    .select({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
      brandingDisplayName: businessDetails.displayName,
      logoImageUrl: businessDetails.logoImageUrl,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .leftJoin(businessDetails, eq(businessDetails.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))

  return rows
}

/** Owner or manager of the given organization may edit that business's details. */
export async function userCanEditBusinessDetailsForOrganization(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const db = getDb()
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(
        eq(member.userId, userId),
        eq(member.organizationId, organizationId),
        inArray(member.role, ["owner", "manager"]),
      ),
    )
    .limit(1)
  return !!row
}
