import { and, asc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { storeBranding } from "@/lib/db/schema-app"

export type StoreSummaryForUser = {
  organizationId: string
  name: string
  slug: string
  role: string
  brandingDisplayName: string | null
  logoImageUrl: string | null
}

export async function listStoresForUser(userId: string): Promise<StoreSummaryForUser[]> {
  const db = getDb()
  const rows = await db
    .select({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
      brandingDisplayName: storeBranding.displayName,
      logoImageUrl: storeBranding.logoImageUrl,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .leftJoin(storeBranding, eq(storeBranding.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))

  return rows
}

/** Owner or manager of the given store may edit that store's branding. */
export async function userCanEditStoreBrandingForOrganization(
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
