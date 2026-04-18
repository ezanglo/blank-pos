import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import { getDb } from "@/lib/db"
import type { PosProductCard, PosProductPrice } from "@/lib/pos/pos-types"
import { derivePosStockBadge } from "@/lib/pos/pos-stock-badge"
import {
  inventoryItem,
  inventoryStock,
  product,
  productCategory,
  productIngredient,
  productPrice,
} from "@/lib/db/schema-catalog"

import { listSellableProductIdsForLocation } from "./catalog"

export type { PosProductCard, PosProductPrice } from "@/lib/pos/pos-types"
export { pickDefaultProductPriceId } from "@/lib/pos/pos-types"

function escapeLikeMeta(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

export type PosProductListFilters = {
  search: string
  categoryId: string
}

function buildPosProductWhere(
  organizationId: string,
  sellableIds: string[],
  filters: PosProductListFilters,
): SQL {
  const parts: SQL[] = [
    eq(product.organizationId, organizationId),
    eq(product.isActive, true),
    inArray(product.id, sellableIds),
  ]
  if (filters.categoryId.length > 0) {
    parts.push(eq(product.categoryId, filters.categoryId))
  }
  const raw = filters.search.trim()
  if (raw.length > 0) {
    const pattern = `%${escapeLikeMeta(raw)}%`
    parts.push(
      or(
        ilike(product.name, pattern),
        ilike(productCategory.name, pattern),
        ilike(sql<string>`COALESCE(${product.sku}, '')`, pattern),
        ilike(sql<string>`COALESCE(${product.qrCode}, '')`, pattern),
      )!,
    )
  }
  return and(...parts)!
}

/** Active products sellable at `locationId` with optional search + category filter. */
export async function listPosProductsForLocation(
  organizationId: string,
  locationId: string,
  filters: PosProductListFilters,
): Promise<PosProductCard[]> {
  const sellableIds = await listSellableProductIdsForLocation(organizationId, locationId)
  if (sellableIds.length === 0) return []

  const db = getDb()
  const whereClause = buildPosProductWhere(organizationId, sellableIds, filters)

  const baseRows = await db
    .select({
      product,
      categoryName: productCategory.name,
    })
    .from(product)
    .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
    .where(whereClause)
    .orderBy(asc(product.name))

  if (baseRows.length === 0) return []

  const productIds = baseRows.map((r) => r.product.id)
  const priceRows = await db
    .select()
    .from(productPrice)
    .where(inArray(productPrice.productId, productIds))
    .orderBy(asc(productPrice.sortOrder), asc(productPrice.label))

  const pricesByProduct = new Map<string, PosProductPrice[]>()
  for (const pr of priceRows) {
    const list = pricesByProduct.get(pr.productId) ?? []
    list.push({
      id: pr.id,
      label: pr.label,
      amountMinor: pr.amountMinor.toString(),
      currency: pr.currency,
      isDefault: pr.isDefault,
      sortOrder: pr.sortOrder,
    })
    pricesByProduct.set(pr.productId, list)
  }

  const linesByProduct = new Map<
    string,
    { quantityMilli: number; stockQuantity: number; reorderPoint: number | null }[]
  >()

  if (productIds.length > 0) {
    const ingRows = await db
      .select({
        productId: productIngredient.productId,
        quantityMilli: productIngredient.quantityMilli,
        inventoryItemId: productIngredient.inventoryItemId,
        stockQuantity: sql<number>`COALESCE(${inventoryStock.quantity}, 0)`.mapWith(Number),
        reorderPoint: inventoryItem.reorderPoint,
      })
      .from(productIngredient)
      .innerJoin(inventoryItem, eq(productIngredient.inventoryItemId, inventoryItem.id))
      .leftJoin(
        inventoryStock,
        and(
          eq(inventoryStock.inventoryItemId, productIngredient.inventoryItemId),
          eq(inventoryStock.organizationId, organizationId),
        ),
      )
      .where(
        and(eq(inventoryItem.organizationId, organizationId), inArray(productIngredient.productId, productIds)),
      )

    for (const r of ingRows) {
      const list = linesByProduct.get(r.productId) ?? []
      list.push({
        quantityMilli: r.quantityMilli,
        stockQuantity: r.stockQuantity,
        reorderPoint: r.reorderPoint,
      })
      linesByProduct.set(r.productId, list)
    }
  }

  return baseRows.map(({ product: p, categoryName }) => {
    const lines = linesByProduct.get(p.id) ?? []
    const stock = lines.length > 0 ? derivePosStockBadge(lines) : null
    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      sku: p.sku,
      qrCode: p.qrCode,
      categoryId: p.categoryId,
      categoryName,
      prices: pricesByProduct.get(p.id) ?? [],
      trackInventory: p.trackInventory,
      prepTimeSeconds: p.prepTimeSeconds ?? null,
      sellableUnits: stock?.sellableUnits ?? null,
      stockBadge: stock?.stockBadge ?? null,
    }
  })
}
