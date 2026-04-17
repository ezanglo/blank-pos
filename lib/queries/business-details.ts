import { and, asc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { businessDetails } from "@/lib/db/schema-app"

export async function getBusinessDetailsByOrganizationId(organizationId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(businessDetails)
    .where(eq(businessDetails.organizationId, organizationId))
    .limit(1)
  return row ?? null
}

/** First organization (by `created_at`) with a `business_details` row, for public metadata / login fallback. */
export async function getAnyBusinessDetailsForPublicSite() {
  const db = getDb()
  const [row] = await db
    .select({ details: businessDetails })
    .from(businessDetails)
    .innerJoin(organization, eq(businessDetails.organizationId, organization.id))
    .orderBy(asc(organization.createdAt))
    .limit(1)
  return row?.details ?? null
}

/** Owner or manager of any org may edit at least one business's details (legacy helper). */
export async function userCanEditBusinessDetails(userId: string): Promise<boolean> {
  const db = getDb()
  const [r] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), inArray(member.role, ["owner", "manager"])))
    .limit(1)
  return !!r
}
