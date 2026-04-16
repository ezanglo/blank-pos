"use server"

import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { organizationBranding } from "@/lib/db/schema-app"
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

export async function updateBranding(
  orgSlug: string,
  input: {
    displayName?: string | null
    tagline?: string | null
    primaryColor: string
    accentColor: string
    receiptHeaderText?: string | null
    receiptFooterText?: string | null
    loginBackgroundImageUrl?: string | null
    logoImageUrl?: string | null
  },
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("Forbidden")
  }

  const db = getDb()
  const base = {
    displayName: input.displayName ?? null,
    tagline: input.tagline ?? null,
    primaryColor: input.primaryColor,
    accentColor: input.accentColor,
    receiptHeaderText: input.receiptHeaderText ?? null,
    receiptFooterText: input.receiptFooterText ?? null,
    updatedAt: new Date(),
  }

  const patch: typeof base & {
    loginBackgroundImageUrl?: string | null
    logoImageUrl?: string | null
  } = { ...base }

  if (Object.hasOwn(input, "loginBackgroundImageUrl")) {
    assertOptionalHttpUrl("Login background image URL", input.loginBackgroundImageUrl)
    patch.loginBackgroundImageUrl = input.loginBackgroundImageUrl?.trim() || null
  }
  if (Object.hasOwn(input, "logoImageUrl")) {
    assertOptionalHttpUrl("Logo image URL", input.logoImageUrl)
    patch.logoImageUrl = input.logoImageUrl?.trim() || null
  }

  await db
    .update(organizationBranding)
    .set(patch)
    .where(eq(organizationBranding.organizationId, ctx.organization.id))

  return { ok: true as const }
}
