import { and, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"
import { organizationBranding } from "@/lib/db/schema-app"

export async function getOrgForUser(slug: string, userId: string) {
  const db = getDb()
  const [org] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1)
  if (!org) return null

  const [m] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, org.id), eq(member.userId, userId)))
    .limit(1)
  if (!m) return null

  const [branding] = await db
    .select()
    .from(organizationBranding)
    .where(eq(organizationBranding.organizationId, org.id))
    .limit(1)

  return { organization: org, member: m, branding: branding ?? null }
}
