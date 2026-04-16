import { and, asc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"

/** Resolves `/{slug}/dashboard` for the signed-in user, preferring the active organization when valid. */
export async function getDashboardPathForUser(
  userId: string,
  activeOrganizationId?: string | null,
): Promise<string | null> {
  const db = getDb()

  if (activeOrganizationId) {
    const [row] = await db
      .select({ slug: organization.slug })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(
        and(eq(member.userId, userId), eq(organization.id, activeOrganizationId)),
      )
      .limit(1)
    if (row) return `/${row.slug}/dashboard`
  }

  const [row] = await db
    .select({ slug: organization.slug })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1)

  return row ? `/${row.slug}/dashboard` : null
}
