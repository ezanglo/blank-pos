"use server"

import { randomUUID } from "node:crypto"

import { APIError } from "better-auth/api"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { businessLocation } from "@/lib/db/schema-app"
import { logAuthEvent } from "@/lib/log-server"
import { stripLocationKeysFromOrganizationMetadata } from "@/lib/org-metadata"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

export type OrganizationLocationInput = {
  defaultCurrency: "PHP" | "USD" | "EUR" | "GBP"
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  phone?: string
}

/**
 * After client `organization.create`, insert the first default branch.
 * Pass `organizationName` only when the store display name should be synced from setup (legacy single-step);
 * omit it when the name was already set on create (separate store + location wizard steps).
 */
export async function createFirstLocationAfterOrgCreate(
  businessSlug: string,
  input: {
    organizationName?: string
    locationSlug: string
    locationName: string
    location: OrganizationLocationInput
  },
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")

  const syncName = input.organizationName?.trim()
  if (syncName) {
    const metadata = stripLocationKeysFromOrganizationMetadata(ctx.organization.metadata)
    try {
      await auth.api.updateOrganization({
        headers: await headers(),
        body: {
          organizationId: ctx.organization.id,
          data: {
            name: syncName,
            metadata,
          },
        },
      })
    } catch (e) {
      logAuthEvent("error", "organization.update_store_failed", {
        orgSlug: businessSlug,
        organizationId: ctx.organization.id,
        message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
      })
      if (e instanceof APIError) throw new Error(e.message)
      throw e
    }
  }

  const db = getDb()
  const now = new Date()
  const loc = input.location

  await db.insert(businessLocation).values({
    id: randomUUID(),
    organizationId: ctx.organization.id,
    slug: input.locationSlug,
    name: input.locationName.trim(),
    isDefault: true,
    defaultCurrency: loc.defaultCurrency,
    addressLine1: loc.addressLine1?.trim() || null,
    addressLine2: loc.addressLine2?.trim() || null,
    city: loc.city?.trim() || null,
    region: loc.region?.trim() || null,
    postalCode: loc.postalCode?.trim() || null,
    phone: loc.phone?.trim() || null,
    createdAt: now,
    updatedAt: now,
  })

  return { ok: true as const }
}

export async function updateStoreAndLocationSettings(
  businessSlug: string,
  locationSlug: string,
  input: {
    storeName: string
    locationName: string
    location: OrganizationLocationInput
  },
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
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
          name: input.storeName.trim(),
          metadata,
        },
      },
    })
  } catch (e) {
    logAuthEvent("error", "organization.update_store_failed", {
      orgSlug: businessSlug,
      organizationId: ctx.organization.id,
      message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
    })
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  const db = getDb()
  const now = new Date()
  const loc = input.location

  const [existing] = await db
    .select({ id: businessLocation.id })
    .from(businessLocation)
    .where(
      and(
        eq(businessLocation.organizationId, ctx.organization.id),
        eq(businessLocation.slug, locationSlug),
      ),
    )
    .limit(1)
  if (!existing) throw new Error("Location not found")

  await db
    .update(businessLocation)
    .set({
      name: input.locationName.trim(),
      defaultCurrency: loc.defaultCurrency,
      addressLine1: loc.addressLine1?.trim() || null,
      addressLine2: loc.addressLine2?.trim() || null,
      city: loc.city?.trim() || null,
      region: loc.region?.trim() || null,
      postalCode: loc.postalCode?.trim() || null,
      phone: loc.phone?.trim() || null,
      updatedAt: now,
    })
    .where(eq(businessLocation.id, existing.id))

  return { ok: true as const }
}

/** Update better-auth organization display name only (org-wide “store name”). */
export async function updateOrganizationStoreName(businessSlug: string, storeName: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
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
          name: storeName.trim(),
          metadata,
        },
      },
    })
  } catch (e) {
    logAuthEvent("error", "organization.update_store_name_failed", {
      orgSlug: businessSlug,
      organizationId: ctx.organization.id,
      message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
    })
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  return { ok: true as const }
}
