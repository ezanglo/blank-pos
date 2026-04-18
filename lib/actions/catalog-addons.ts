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
import { getDefaultCatalogCurrencyCode } from "@/lib/queries/catalog-currency"
import {
  catalogAddonCreateSchema,
  catalogAddonSetCategoriesSchema,
  catalogAddonUpdateSchema,
  catalogCategoryAddonLinksSchema,
} from "@/lib/schemas/catalog-addons"

export async function createProductAddon(
  businessSlug: string,
  raw: z.input<typeof catalogAddonCreateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogAddonCreateSchema.parse(raw)
  const amountMinor = parseDecimal2ToMinor(input.amount)
  const currency = await getDefaultCatalogCurrencyCode(ctx.organization.id)
  const db = getDb()
  const id = randomUUID()
  await db.insert(productAddon).values({
    id,
    organizationId: ctx.organization.id,
    name: input.name,
    amountMinor,
    currency,
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
  const currency = await getDefaultCatalogCurrencyCode(ctx.organization.id)
  const db = getDb()
  const [row] = await db
    .select({ id: productAddon.id })
    .from(productAddon)
    .where(
      and(eq(productAddon.id, input.id), eq(productAddon.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!row) throw new Error("Add-on not found.")

  const patch: {
    name: string
    amountMinor: bigint
    currency: string
    isActive: boolean
    sortOrder?: number
  } = {
    name: input.name,
    amountMinor,
    currency,
    /** Same idea as variants / instructions: if it exists in catalog, it is offered on the POS; unlink to hide. */
    isActive: true,
  }
  if (input.sortOrder !== undefined && input.sortOrder !== null) {
    patch.sortOrder = input.sortOrder
  }

  await db.update(productAddon).set(patch).where(eq(productAddon.id, input.id))

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

export async function setCategoryAddonLinks(
  businessSlug: string,
  raw: z.input<typeof catalogCategoryAddonLinksSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogCategoryAddonLinksSchema.parse(raw)
  const db = getDb()

  const [cat] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(
      and(
        eq(productCategory.id, input.categoryId),
        eq(productCategory.organizationId, ctx.organization.id),
      ),
    )
    .limit(1)
  if (!cat) throw new Error("Category not found.")

  const uniqueAddonIds = [...new Set(input.addonIds)]
  if (uniqueAddonIds.length !== input.addonIds.length) {
    throw new Error("Duplicate add-ons in list.")
  }

  if (uniqueAddonIds.length > 0) {
    const addonRows = await db
      .select({ id: productAddon.id })
      .from(productAddon)
      .where(
        and(
          eq(productAddon.organizationId, ctx.organization.id),
          inArray(productAddon.id, uniqueAddonIds),
        ),
      )
    if (addonRows.length !== uniqueAddonIds.length) {
      throw new Error("One or more add-ons are invalid.")
    }
  }

  await db.delete(productCategoryAddon).where(eq(productCategoryAddon.categoryId, input.categoryId))

  if (uniqueAddonIds.length > 0) {
    await db.insert(productCategoryAddon).values(
      uniqueAddonIds.map((addonId, i) => ({
        id: randomUUID(),
        categoryId: input.categoryId,
        addonId,
        sortOrder: i * 10,
      })),
    )
  }

  return { ok: true as const }
}
