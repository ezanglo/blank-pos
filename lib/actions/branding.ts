"use server"

import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { member } from "@/lib/db/schema"
import { storeBranding } from "@/lib/db/schema-app"
import { STORE_BRANDING_ID, userCanEditStoreBranding } from "@/lib/queries/store-branding"
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
  loginBackgroundImageUrl?: string | null
  logoImageUrl?: string | null
}

function assertBrandingUrls(input: StoreBrandingWriteInput) {
  assertOptionalHttpUrl("Website URL", input.websiteUrl)
  assertOptionalHttpUrl("Menu URL", input.menuUrl)
  assertOptionalHttpUrl("Instagram URL", input.instagramUrl)
  assertOptionalHttpUrl("Facebook URL", input.facebookUrl)
  assertOptionalHttpUrl("Login background image URL", input.loginBackgroundImageUrl)
  assertOptionalHttpUrl("Logo image URL", input.logoImageUrl)
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
    loginBackgroundImageUrl: trimToNull(input.loginBackgroundImageUrl),
    logoImageUrl: trimToNull(input.logoImageUrl),
    updatedAt: now,
  }
}

async function upsertStoreBranding(input: StoreBrandingWriteInput) {
  assertBrandingUrls(input)
  const row = brandingRowValues(input)
  const db = getDb()
  await db
    .insert(storeBranding)
    .values({ id: STORE_BRANDING_ID, ...row })
    .onConflictDoUpdate({
      target: storeBranding.id,
      set: row,
    })
}

/**
 * Saves shared `store_branding` before the user belongs to any organization (setup wizard only).
 * Once they join an org, use `updateStoreBranding` instead.
 */
export async function setupPhaseSaveStoreBranding(input: StoreBrandingWriteInput) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const db = getDb()
  const [existingMembership] = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1)
  if (existingMembership) {
    const allowed = await userCanEditStoreBranding(session.user.id)
    if (!allowed) throw new Error("Forbidden")
  }

  await upsertStoreBranding(input)
  return { ok: true as const }
}

/** Updates the single `store_branding` row (shared store branding). */
export async function updateStoreBranding(input: StoreBrandingWriteInput) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const allowed = await userCanEditStoreBranding(session.user.id)
  if (!allowed) throw new Error("Forbidden")

  await upsertStoreBranding(input)

  return { ok: true as const }
}
