import { and, eq } from "drizzle-orm"
import { cache } from "react"

import { getDb } from "@/lib/db"
import { member, organization } from "@/lib/db/schema"

/** Dedupes org+member lookup within a single RSC / request (e.g. business layout + shell). */
export const getOrgForUser = cache(async (businessSlug: string, userId: string) => {
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

  return { organization: org, member: m }
})
