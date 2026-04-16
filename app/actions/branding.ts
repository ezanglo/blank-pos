"use server"

import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { organizationBranding } from "@/lib/db/schema-app"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

export async function updateBranding(
  orgSlug: string,
  input: {
    displayName?: string | null
    tagline?: string | null
    primaryColor: string
    accentColor: string
    receiptHeaderText?: string | null
    receiptFooterText?: string | null
  },
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("Forbidden")
  }

  const db = getDb()
  await db
    .update(organizationBranding)
    .set({
      displayName: input.displayName ?? null,
      tagline: input.tagline ?? null,
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      receiptHeaderText: input.receiptHeaderText ?? null,
      receiptFooterText: input.receiptFooterText ?? null,
      updatedAt: new Date(),
    })
    .where(eq(organizationBranding.organizationId, ctx.organization.id))

  return { ok: true as const }
}
