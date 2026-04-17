"use server"

import { APIError } from "better-auth/api"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { storeLocation } from "@/lib/db/schema-app"
import { logAuthEvent } from "@/lib/log-server"
import { stripLocationKeysFromOrganizationMetadata } from "@/lib/org-metadata"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

export type OrganizationLocationInput = {
  defaultCurrency: "USD" | "EUR" | "GBP" | "PHP"
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  phone?: string
}

export async function updateOrganizationStore(
  orgSlug: string,
  input: { name: string; location: OrganizationLocationInput },
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("Forbidden")
  }

  const metadata = stripLocationKeysFromOrganizationMetadata(ctx.organization.metadata)

  try {
    await auth.api.updateOrganization({
      headers: await headers(),
      body: {
        organizationId: ctx.organization.id,
        data: {
          name: input.name.trim(),
          metadata,
        },
      },
    })
  } catch (e) {
    logAuthEvent("error", "organization.update_store_failed", {
      orgSlug,
      organizationId: ctx.organization.id,
      message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
    })
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  const db = getDb()
  const now = new Date()
  const loc = input.location
  await db
    .insert(storeLocation)
    .values({
      organizationId: ctx.organization.id,
      defaultCurrency: loc.defaultCurrency,
      addressLine1: loc.addressLine1?.trim() || null,
      addressLine2: loc.addressLine2?.trim() || null,
      city: loc.city?.trim() || null,
      region: loc.region?.trim() || null,
      postalCode: loc.postalCode?.trim() || null,
      phone: loc.phone?.trim() || null,
    })
    .onConflictDoUpdate({
      target: storeLocation.organizationId,
      set: {
        defaultCurrency: loc.defaultCurrency,
        addressLine1: loc.addressLine1?.trim() || null,
        addressLine2: loc.addressLine2?.trim() || null,
        city: loc.city?.trim() || null,
        region: loc.region?.trim() || null,
        postalCode: loc.postalCode?.trim() || null,
        phone: loc.phone?.trim() || null,
        updatedAt: now,
      },
    })

  return { ok: true as const }
}
