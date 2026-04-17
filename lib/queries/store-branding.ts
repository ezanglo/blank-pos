import { and, asc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { storeBranding } from "@/lib/db/schema-app"

export async function getStoreBrandingByOrganizationId(organizationId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(storeBranding)
    .where(eq(storeBranding.organizationId, organizationId))
    .limit(1)
  return row ?? null
}

/** First store (by org `created_at`) with branding row, for public metadata / login fallback. */
export async function getAnyStoreBrandingForPublicSite() {
  const db = getDb()
  const [row] = await db
    .select({ branding: storeBranding })
    .from(storeBranding)
    .innerJoin(organization, eq(storeBranding.organizationId, organization.id))
    .orderBy(asc(organization.createdAt))
    .limit(1)
  return row?.branding ?? null
}

/** Owner or manager of any org may edit at least one store's branding (legacy helper). */
export async function userCanEditStoreBranding(userId: string): Promise<boolean> {
  const db = getDb()
  const [r] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.userId, userId), inArray(member.role, ["owner", "manager"])))
    .limit(1)
  return !!r
}
