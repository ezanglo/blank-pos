"use server"

import { randomUUID } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import {
  productAddon,
  productCategory,
  productCategoryAddon,
} from "@/lib/db/schema-catalog"
import { parseDecimal2ToMinor } from "@/lib/money"
import {
  catalogAddonCreateSchema,
  catalogAddonSetCategoriesSchema,
  catalogAddonUpdateSchema,
} from "@/lib/schemas/catalog-addons"

export async function createProductAddon(
  businessSlug: string,
  raw: z.input<typeof catalogAddonCreateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogAddonCreateSchema.parse(raw)
  const amountMinor = parseDecimal2ToMinor(input.amount)
  const db = getDb()
  const id = randomUUID()
  await db.insert(productAddon).values({
    id,
    organizationId: ctx.organization.id,
    name: input.name,
    amountMinor,
    currency: input.currency.trim().toUpperCase(),
    isActive: true,
    sortOrder: input.sortOrder ?? 0,
  })
  return { ok: true as const, id }
}

export async function updateProductAddon(
  businessSlug: string,
  raw: z.input<typeof catalogAddonUpdateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogAddonUpdateSchema.parse(raw)
  const amountMinor = parseDecimal2ToMinor(input.amount)
  const db = getDb()
  const [row] = await db
    .select({ id: productAddon.id })
    .from(productAddon)
    .where(
      and(eq(productAddon.id, input.id), eq(productAddon.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!row) throw new Error("Add-on not found.")

  await db
    .update(productAddon)
    .set({
      name: input.name,
      amountMinor,
      currency: input.currency.trim().toUpperCase(),
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    })
    .where(eq(productAddon.id, input.id))

  return { ok: true as const }
}

export async function deleteProductAddon(businessSlug: string, addonId: string) {
  const ctx = await requireCatalogManager(businessSlug)
  const db = getDb()
  const [row] = await db
    .select({ id: productAddon.id })
    .from(productAddon)
    .where(
      and(eq(productAddon.id, addonId), eq(productAddon.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!row) throw new Error("Add-on not found.")

  try {
    await db.delete(productAddon).where(eq(productAddon.id, addonId))
  } catch {
    throw new Error("Cannot delete this add-on while it appears on past sales. Deactivate it instead.")
  }
  return { ok: true as const }
}

export async function setProductAddonCategories(
  businessSlug: string,
  raw: z.input<typeof catalogAddonSetCategoriesSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogAddonSetCategoriesSchema.parse(raw)
  const db = getDb()

  const [addon] = await db
    .select({ id: productAddon.id })
    .from(productAddon)
    .where(
      and(
        eq(productAddon.id, input.addonId),
        eq(productAddon.organizationId, ctx.organization.id),
      ),
    )
    .limit(1)
  if (!addon) throw new Error("Add-on not found.")

  const uniqueCategoryIds = [...new Set(input.categoryIds)]
  if (uniqueCategoryIds.length > 0) {
    const cats = await db
      .select({ id: productCategory.id })
      .from(productCategory)
      .where(
        and(
          eq(productCategory.organizationId, ctx.organization.id),
          inArray(productCategory.id, uniqueCategoryIds),
        ),
      )
    if (cats.length !== uniqueCategoryIds.length) {
      throw new Error("One or more categories are invalid.")
    }
  }

  await db.delete(productCategoryAddon).where(eq(productCategoryAddon.addonId, input.addonId))

  if (uniqueCategoryIds.length > 0) {
    await db.insert(productCategoryAddon).values(
      uniqueCategoryIds.map((categoryId, i) => ({
        id: randomUUID(),
        categoryId,
        addonId: input.addonId,
        sortOrder: i * 10,
      })),
    )
  }

  return { ok: true as const }
}
