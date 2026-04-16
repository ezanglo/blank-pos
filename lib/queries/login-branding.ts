import { asc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { organization } from "@/lib/db/schema"
import { organizationBranding } from "@/lib/db/schema-app"

export type LoginBranding = {
  orgSlug: string
  displayName: string | null
  tagline: string | null
  primaryColor: string
  accentColor: string
  logoImageUrl: string | null
  loginBackgroundImageUrl: string | null
} | null

/**
 * Public read for `/login` styling: resolve one org’s branding.
 * - If `orgSlug` is passed (e.g. `?org=my-store`), use that organization.
 * - Else if there is exactly one organization, use its branding.
 * - Otherwise return null (generic login).
 */
export async function getLoginBranding(orgSlug?: string | null): Promise<LoginBranding> {
  const db = getDb()

  if (orgSlug?.trim()) {
    const slug = orgSlug.trim().toLowerCase()
    const [org] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1)
    if (!org) return null
    const [b] = await db
      .select()
      .from(organizationBranding)
      .where(eq(organizationBranding.organizationId, org.id))
      .limit(1)
    if (!b) return null
    return {
      orgSlug: org.slug,
      displayName: b.displayName,
      tagline: b.tagline,
      primaryColor: b.primaryColor,
      accentColor: b.accentColor,
      logoImageUrl: b.logoImageUrl,
      loginBackgroundImageUrl: b.loginBackgroundImageUrl,
    }
  }

  const orgs = await db.select().from(organization).orderBy(asc(organization.createdAt)).limit(2)
  if (orgs.length !== 1) return null

  const [b] = await db
    .select()
    .from(organizationBranding)
    .where(eq(organizationBranding.organizationId, orgs[0].id))
    .limit(1)
  if (!b) return null

  return {
    orgSlug: orgs[0].slug,
    displayName: b.displayName,
    tagline: b.tagline,
    primaryColor: b.primaryColor,
    accentColor: b.accentColor,
    logoImageUrl: b.logoImageUrl,
    loginBackgroundImageUrl: b.loginBackgroundImageUrl,
  }
}
