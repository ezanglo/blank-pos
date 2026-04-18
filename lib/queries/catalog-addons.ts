import { and, asc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import {
  productAddon,
  productCategory,
  productCategoryAddon,
  type ProductAddonRow,
} from "@/lib/db/schema-catalog"

/** Add-on row with category IDs it is linked to (POS / admin). */
export type ProductAddonWithCategories = ProductAddonRow & {
  categoryIds: string[]
}

export async function listProductAddonsWithCategories(
  organizationId: string,
): Promise<ProductAddonWithCategories[]> {
  const db = getDb()
  const addons = await db
    .select()
    .from(productAddon)
    .where(eq(productAddon.organizationId, organizationId))
    .orderBy(asc(productAddon.sortOrder), asc(productAddon.name))

  if (addons.length === 0) return []

  const addonIds = addons.map((a) => a.id)
  const links = await db
    .select({
      addonId: productCategoryAddon.addonId,
      categoryId: productCategoryAddon.categoryId,
    })
    .from(productCategoryAddon)
    .where(inArray(productCategoryAddon.addonId, addonIds))

  const byAddon = new Map<string, string[]>()
  for (const l of links) {
    const list = byAddon.get(l.addonId) ?? []
    list.push(l.categoryId)
    byAddon.set(l.addonId, list)
  }

  return addons.map((a) => ({
    ...a,
    categoryIds: byAddon.get(a.id) ?? [],
  }))
}

/** Serialized amount for client JSON. */
export type PosCategoryAddon = {
  id: string
  name: string
  amountMinor: string
  currency: string
  sortOrder: number
}

/**
 * Active add-ons per product category, for POS (keyed by category id).
 * Only categories that have at least one add-on appear in the record.
 */
export async function listActiveAddonsByCategoryId(
  organizationId: string,
): Promise<Record<string, PosCategoryAddon[]>> {
  const db = getDb()
  const rows = await db
    .select({
      categoryId: productCategoryAddon.categoryId,
      sortOrder: productCategoryAddon.sortOrder,
      addon: productAddon,
    })
    .from(productCategoryAddon)
    .innerJoin(productAddon, eq(productCategoryAddon.addonId, productAddon.id))
    .innerJoin(productCategory, eq(productCategoryAddon.categoryId, productCategory.id))
    .where(
      and(
        eq(productAddon.organizationId, organizationId),
        eq(productAddon.isActive, true),
        eq(productCategory.organizationId, organizationId),
      ),
    )
    .orderBy(
      asc(productCategoryAddon.categoryId),
      asc(productCategoryAddon.sortOrder),
      asc(productAddon.name),
    )

  const out: Record<string, PosCategoryAddon[]> = {}
  for (const r of rows) {
    const list = out[r.categoryId] ?? []
    list.push({
      id: r.addon.id,
      name: r.addon.name,
      amountMinor: r.addon.amountMinor.toString(),
      currency: r.addon.currency,
      sortOrder: r.sortOrder,
    })
    out[r.categoryId] = list
  }
  return out
}
