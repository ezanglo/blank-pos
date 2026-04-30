"use server"

import { randomUUID } from "node:crypto"

import { and, asc, count, eq, ne } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { businessLocation } from "@/lib/db/schema-app"
import type { OrganizationLocationInput } from "@/lib/actions/organization"
import { checkSetupLocationSlugAvailable } from "@/lib/actions/setup-slugs"
import { getOrgForUser } from "@/lib/queries/organization"
import { normalizeSetupWebSlug } from "@/lib/setup-slug-normalize"
import { getServerSession } from "@/lib/server-auth"

async function requireOrgManager(businessSlug: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("Forbidden")
  }
  return ctx
}

export async function createOrganizationLocation(
  businessSlug: string,
  input: {
    locationSlug: string
    locationName: string
    location: OrganizationLocationInput
  },
) {
  const ctx = await requireOrgManager(businessSlug)
  const slugCheck = await checkSetupLocationSlugAvailable(businessSlug, input.locationSlug)
  if (slugCheck.status !== "available") {
    throw new Error(
      slugCheck.status === "taken"
        ? "That location link is already in use."
        : slugCheck.status === "forbidden"
          ? "You cannot add a location here."
          : "Use a valid location link (lowercase letters, numbers, hyphens).",
    )
  }

  const db = getDb()
  const [countRow] = await db
    .select({ n: count() })
    .from(businessLocation)
    .where(eq(businessLocation.organizationId, ctx.organization.id))
  const isFirst = (countRow?.n ?? 0) === 0

  const now = new Date()
  const loc = input.location
  await db.insert(businessLocation).values({
    id: randomUUID(),
    organizationId: ctx.organization.id,
    slug: input.locationSlug.trim().toLowerCase(),
    name: input.locationName.trim(),
    isDefault: isFirst,
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

export async function updateOrganizationLocationBranch(
  businessSlug: string,
  locationId: string,
  input: {
    locationName: string
    location: OrganizationLocationInput
    /** When set (and differs from the current slug), updates the `/l/[locationSlug]` URL segment after validation. */
    locationSlug?: string
  },
) {
  const ctx = await requireOrgManager(businessSlug)
  const db = getDb()
  const now = new Date()
  const loc = input.location

  const [existing] = await db
    .select({ id: businessLocation.id, slug: businessLocation.slug })
    .from(businessLocation)
    .where(
      and(eq(businessLocation.organizationId, ctx.organization.id), eq(businessLocation.id, locationId)),
    )
    .limit(1)
  if (!existing) throw new Error("Location not found.")

  let nextSlug = existing.slug
  if (input.locationSlug !== undefined) {
    const normalized = normalizeSetupWebSlug(input.locationSlug)
    if (!normalized) {
      throw new Error("Use a valid location link (lowercase letters, numbers, hyphens).")
    }
    if (normalized !== existing.slug) {
      const slugCheck = await checkSetupLocationSlugAvailable(businessSlug, normalized, existing.id)
      if (slugCheck.status !== "available") {
        throw new Error(
          slugCheck.status === "taken"
            ? "That location link is already in use."
            : slugCheck.status === "forbidden"
              ? "You cannot change this location."
              : "Use a valid location link (lowercase letters, numbers, hyphens).",
        )
      }
      nextSlug = normalized
    }
  }

  await db
    .update(businessLocation)
    .set({
      slug: nextSlug,
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

  return { ok: true as const, locationSlug: nextSlug }
}

export async function deleteOrganizationLocation(businessSlug: string, locationId: string) {
  const ctx = await requireOrgManager(businessSlug)
  const db = getDb()

  const [countRow] = await db
    .select({ n: count() })
    .from(businessLocation)
    .where(eq(businessLocation.organizationId, ctx.organization.id))
  if ((countRow?.n ?? 0) <= 1) {
    throw new Error("You must keep at least one location.")
  }

  const [target] = await db
    .select()
    .from(businessLocation)
    .where(
      and(eq(businessLocation.organizationId, ctx.organization.id), eq(businessLocation.id, locationId)),
    )
    .limit(1)
  if (!target) throw new Error("Location not found.")

  await db.transaction(async (tx) => {
    if (target.isDefault) {
      const [replacement] = await tx
        .select({ id: businessLocation.id })
        .from(businessLocation)
        .where(
          and(
            eq(businessLocation.organizationId, ctx.organization.id),
            ne(businessLocation.id, locationId),
          ),
        )
        .orderBy(asc(businessLocation.createdAt))
        .limit(1)
      if (!replacement) throw new Error("Could not reassign default location.")
      await tx
        .update(businessLocation)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(businessLocation.organizationId, ctx.organization.id))
      await tx
        .update(businessLocation)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(businessLocation.id, replacement.id))
    }
    await tx.delete(businessLocation).where(eq(businessLocation.id, locationId))
  })

  return { ok: true as const }
}
