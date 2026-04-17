"use server"

import { getDb } from "@/lib/db"
import { storeBranding } from "@/lib/db/schema-app"
import { getStoreBrandingByOrganizationId } from "@/lib/queries/store-branding"
import { userCanEditStoreBrandingForOrganization } from "@/lib/queries/stores"
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

export type StoreBrandingWriteInput = {
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
}

function assertBrandingUrls(input: StoreBrandingWriteInput) {
  assertOptionalHttpUrl("Website URL", input.websiteUrl)
  assertOptionalHttpUrl("Menu URL", input.menuUrl)
  assertOptionalHttpUrl("Instagram URL", input.instagramUrl)
  assertOptionalHttpUrl("Facebook URL", input.facebookUrl)
  assertOptionalLogoOrImageUrl(input.logoImageUrl)
}

function brandingRowValues(input: StoreBrandingWriteInput) {
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
    updatedAt: now,
  }
}

async function upsertStoreBrandingForOrganization(
  organizationId: string,
  input: StoreBrandingWriteInput,
) {
  assertBrandingUrls(input)
  const row = brandingRowValues(input)
  const db = getDb()
  await db
    .insert(storeBranding)
    .values({ organizationId, ...row })
    .onConflictDoUpdate({
      target: storeBranding.organizationId,
      set: row,
    })
}

/**
 * Setup wizard: save branding for a store the user just created (must be a member).
 * Call after `organization.create` + first location exist.
 */
export async function setupPhaseSaveStoreBranding(
  storeSlug: string,
  input: StoreBrandingWriteInput,
) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(storeSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  await upsertStoreBrandingForOrganization(ctx.organization.id, input)
  return { ok: true as const }
}

/** After `organization.create`, seed `store_branding` with display name = organization name. */
export async function seedInitialStoreBrandingAfterOrgCreate(storeSlug: string) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(storeSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  const displayName = ctx.organization.name?.trim() || null
  await upsertStoreBrandingForOrganization(ctx.organization.id, { displayName })
  return { ok: true as const }
}

/** Updates branding for a specific store (owner/manager of that store). */
export async function updateStoreBranding(storeSlug: string, input: StoreBrandingWriteInput) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(storeSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  const allowed = await userCanEditStoreBrandingForOrganization(
    session.user.id,
    ctx.organization.id,
  )
  if (!allowed) throw new Error("Forbidden")

  await upsertStoreBrandingForOrganization(ctx.organization.id, input)

  return { ok: true as const }
}

/** Read branding for settings form (server). */
export async function getStoreBrandingForSessionStore(storeSlug: string) {
  const session = await getServerSession()
  if (!session?.user?.id) return null
  const ctx = await getOrgForUser(storeSlug, session.user.id)
  if (!ctx) return null
  const allowed = await userCanEditStoreBrandingForOrganization(
    session.user.id,
    ctx.organization.id,
  )
  if (!allowed) return null
  return getStoreBrandingByOrganizationId(ctx.organization.id)
}
