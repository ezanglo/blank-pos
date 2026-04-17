"use server"

import { getDb } from "@/lib/db"
import type { BusinessDetails } from "@/lib/db/schema-app"
import { businessDetails } from "@/lib/db/schema-app"
import { getBusinessDetailsByOrganizationId } from "@/lib/queries/business-details"
import { userCanEditBusinessDetailsForOrganization } from "@/lib/queries/stores"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

function assertOptionalHttpUrl(label: string, value: string | null | undefined) {
  if (value == null || value.trim() === "") return
  try {
    const u = new URL(value.trim())
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error(`${label} must be an http(s) URL.`)
    }
  } catch {
    throw new Error(`${label} must be a valid http(s) URL.`)
  }
}

function assertOptionalLogoOrImageUrl(value: string | null | undefined) {
  if (value == null || value.trim() === "") return
  const t = value.trim()
  if (t.startsWith("/uploads/")) {
    if (t.includes("..")) throw new Error("Logo image path is invalid.")
    return
  }
  assertOptionalHttpUrl("Logo image URL", t)
}

function trimToNull(s: string | null | undefined) {
  const t = s?.trim()
  return t === "" || t == null ? null : t
}

export type BusinessDetailsWriteInput = {
  displayName?: string | null
  tagline?: string | null
  receiptHeaderText?: string | null
  receiptFooterText?: string | null
  legalName?: string | null
  taxIdentifier?: string | null
  websiteUrl?: string | null
  menuUrl?: string | null
  contactEmail?: string | null
  publicPhone?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
  operatingHoursText?: string | null
  primaryColor?: string | null
  accentColor?: string | null
  logoImageUrl?: string | null
  businessCategory?: string | null
  teamScaleBand?: string | null
  expectedGoLive?: string | null
}

function assertBrandingUrls(input: BusinessDetailsWriteInput) {
  assertOptionalHttpUrl("Website URL", input.websiteUrl)
  assertOptionalHttpUrl("Menu URL", input.menuUrl)
  assertOptionalHttpUrl("Instagram URL", input.instagramUrl)
  assertOptionalHttpUrl("Facebook URL", input.facebookUrl)
  assertOptionalLogoOrImageUrl(input.logoImageUrl)
}

function businessDetailsRowValues(input: BusinessDetailsWriteInput) {
  const now = new Date()
  return {
    displayName: trimToNull(input.displayName),
    tagline: trimToNull(input.tagline),
    receiptHeaderText: trimToNull(input.receiptHeaderText),
    receiptFooterText: trimToNull(input.receiptFooterText),
    legalName: trimToNull(input.legalName),
    taxIdentifier: trimToNull(input.taxIdentifier),
    websiteUrl: trimToNull(input.websiteUrl),
    menuUrl: trimToNull(input.menuUrl),
    contactEmail: trimToNull(input.contactEmail),
    publicPhone: trimToNull(input.publicPhone),
    instagramUrl: trimToNull(input.instagramUrl),
    facebookUrl: trimToNull(input.facebookUrl),
    operatingHoursText: trimToNull(input.operatingHoursText),
    primaryColor: trimToNull(input.primaryColor),
    accentColor: trimToNull(input.accentColor),
    logoImageUrl: trimToNull(input.logoImageUrl),
    businessCategory: trimToNull(input.businessCategory),
    teamScaleBand: trimToNull(input.teamScaleBand),
    expectedGoLive: trimToNull(input.expectedGoLive),
    updatedAt: now,
  }
}

function businessDetailsRowToWriteInput(row: BusinessDetails): BusinessDetailsWriteInput {
  return {
    displayName: row.displayName,
    tagline: row.tagline,
    receiptHeaderText: row.receiptHeaderText,
    receiptFooterText: row.receiptFooterText,
    legalName: row.legalName,
    taxIdentifier: row.taxIdentifier,
    websiteUrl: row.websiteUrl,
    menuUrl: row.menuUrl,
    contactEmail: row.contactEmail,
    publicPhone: row.publicPhone,
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    operatingHoursText: row.operatingHoursText,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    logoImageUrl: row.logoImageUrl,
    businessCategory: row.businessCategory,
    teamScaleBand: row.teamScaleBand,
    expectedGoLive: row.expectedGoLive,
  }
}

function mergeBusinessDetailsWriteInput(
  existing: BusinessDetails | null,
  patch: Partial<BusinessDetailsWriteInput>,
): BusinessDetailsWriteInput {
  const base = existing ? businessDetailsRowToWriteInput(existing) : {}
  const out: BusinessDetailsWriteInput = { ...base }
  for (const key of Object.keys(patch) as (keyof BusinessDetailsWriteInput)[]) {
    const v = patch[key]
    if (v !== undefined) {
      ;(out as Record<string, unknown>)[key] = v
    }
  }
  return out
}

async function upsertBusinessDetailsForOrganization(
  organizationId: string,
  input: BusinessDetailsWriteInput,
) {
  assertBrandingUrls(input)
  const row = businessDetailsRowValues(input)
  const db = getDb()
  await db
    .insert(businessDetails)
    .values({ organizationId, ...row })
    .onConflictDoUpdate({
      target: businessDetails.organizationId,
      set: row,
    })
}

/**
 * Onboarding: save presentation / legal fields for a business the user just created (must be a member).
 */
export async function setupPhaseSaveBusinessDetails(
  businessSlug: string,
  input: BusinessDetailsWriteInput,
) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  await upsertBusinessDetailsForOrganization(ctx.organization.id, input)
  return { ok: true as const }
}

/** After `organization.create`, seed `business_details` with display name = organization name. */
export async function seedInitialBusinessDetailsAfterOrgCreate(businessSlug: string) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  const displayName = ctx.organization.name?.trim() || null
  await upsertBusinessDetailsForOrganization(ctx.organization.id, { displayName })
  return { ok: true as const }
}

/** Updates business details for a specific organization (owner/manager). */
export async function updateBusinessDetails(businessSlug: string, input: BusinessDetailsWriteInput) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  const allowed = await userCanEditBusinessDetailsForOrganization(
    session.user.id,
    ctx.organization.id,
  )
  if (!allowed) throw new Error("Forbidden")

  await upsertBusinessDetailsForOrganization(ctx.organization.id, input)

  return { ok: true as const }
}

/** Merge partial branding fields into the existing row, then upsert (safe for per-card saves). */
export async function patchBusinessDetails(
  businessSlug: string,
  patch: Partial<BusinessDetailsWriteInput>,
) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  const allowed = await userCanEditBusinessDetailsForOrganization(
    session.user.id,
    ctx.organization.id,
  )
  if (!allowed) throw new Error("Forbidden")

  const existing = await getBusinessDetailsByOrganizationId(ctx.organization.id)
  const merged = mergeBusinessDetailsWriteInput(existing, patch)
  await upsertBusinessDetailsForOrganization(ctx.organization.id, merged)

  return { ok: true as const }
}

/** Read business details for settings form (server). */
export async function getBusinessDetailsForSessionBusiness(businessSlug: string) {
  const session = await getServerSession()
  if (!session?.user?.id) return null
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) return null
  const allowed = await userCanEditBusinessDetailsForOrganization(
    session.user.id,
    ctx.organization.id,
  )
  if (!allowed) return null
  return getBusinessDetailsByOrganizationId(ctx.organization.id)
}
