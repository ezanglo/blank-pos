"use server"

import { and, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { organization } from "@/lib/db/schema"
import { businessLocation } from "@/lib/db/schema-app"
import { getOrgForUser } from "@/lib/queries/organization"
import { normalizeSetupWebSlug } from "@/lib/setup-slug-normalize"
import { getServerSession } from "@/lib/server-auth"

export type SetupSlugCheckStatus = "available" | "taken" | "invalid"

export async function checkSetupStoreSlugAvailable(
  rawSlug: string,
): Promise<{ status: SetupSlugCheckStatus }> {
  const session = await getServerSession()
  if (!session?.user?.id) return { status: "invalid" }

  const slug = normalizeSetupWebSlug(rawSlug)
  if (!slug) return { status: "invalid" }

  const db = getDb()
  const [row] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1)

  return row ? { status: "taken" } : { status: "available" }
}

export async function checkSetupLocationSlugAvailable(
  businessSlug: string,
  rawLocationSlug: string,
): Promise<{ status: SetupSlugCheckStatus | "forbidden" }> {
  const session = await getServerSession()
  if (!session?.user?.id) return { status: "invalid" }

  const slug = normalizeSetupWebSlug(rawLocationSlug)
  if (!slug) return { status: "invalid" }

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) return { status: "forbidden" }

  const db = getDb()
  const [row] = await db
    .select({ id: businessLocation.id })
    .from(businessLocation)
    .where(
      and(
        eq(businessLocation.organizationId, ctx.organization.id),
        eq(businessLocation.slug, slug),
      ),
    )
    .limit(1)

  return row ? { status: "taken" } : { status: "available" }
}
