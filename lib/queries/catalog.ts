import { and, asc, eq, ilike, inArray, isNotNull, lte, or, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { businessLocation } from "@/lib/db/schema-app"
import {
  inventoryItem,
  inventoryStock,
  product,
  productCategory,
  productCategoryInstruction,
  productCategoryVariant,
  productIngredient,
  productLocation,
  productPrice,
} from "@/lib/db/schema-catalog"
import { formatMilliToDecimal3 } from "@/lib/money"

function escapeLikeMeta(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function buildInventoryListWhere(organizationId: string, search: string): SQL {
  const parts: SQL[] = [eq(inventoryItem.organizationId, organizationId)]
  const raw = search.trim()
  if (raw.length > 0) {
    const pattern = `%${escapeLikeMeta(raw)}%`
    parts.push(or(ilike(inventoryItem.name, pattern), ilike(inventoryItem.unit, pattern))!)
  }
  return and(...parts)!
}

export async function listProductCategories(organizationId: string) {
  const db = getDb()
  return db
    .select()
    .from(productCategory)
    .where(eq(productCategory.organizationId, organizationId))
    .orderBy(asc(productCategory.sortOrder), asc(productCategory.name))
}

export type CategoryVariantListRow = typeof productCategoryVariant.$inferSelect

export async function listCategoryVariantsForOrganization(
  organizationId: string,
): Promise<CategoryVariantListRow[]> {
  const db = getDb()
  return db
    .select({ v: productCategoryVariant })
    .from(productCategoryVariant)
    .innerJoin(productCategory, eq(productCategoryVariant.categoryId, productCategory.id))
    .where(eq(productCategory.organizationId, organizationId))
    .orderBy(asc(productCategoryVariant.sortOrder), asc(productCategoryVariant.label))
    .then((rows) => rows.map((r) => r.v))
}

export type CategoryInstructionListRow = typeof productCategoryInstruction.$inferSelect

export async function listCategoryInstructionsForOrganization(
  organizationId: string,
): Promise<CategoryInstructionListRow[]> {
  const db = getDb()
  return db
    .select({ i: productCategoryInstruction })
    .from(productCategoryInstruction)
    .innerJoin(productCategory, eq(productCategoryInstruction.categoryId, productCategory.id))
    .where(eq(productCategory.organizationId, organizationId))
    .orderBy(asc(productCategoryInstruction.sortOrder), asc(productCategoryInstruction.label))
    .then((rows) => rows.map((r) => r.i))
}

/** POS: preset instructions per category (no price). */
export type PosCategoryInstruction = {
  id: string
  label: string
  sortOrder: number
}

export async function listInstructionsByCategoryIdForPos(
  organizationId: string,
): Promise<Record<string, PosCategoryInstruction[]>> {
  const db = getDb()
  const rows = await db
    .select({ categoryId: productCategoryInstruction.categoryId, row: productCategoryInstruction })
    .from(productCategoryInstruction)
    .innerJoin(productCategory, eq(productCategoryInstruction.categoryId, productCategory.id))
    .where(eq(productCategory.organizationId, organizationId))
    .orderBy(
      asc(productCategoryInstruction.categoryId),
      asc(productCategoryInstruction.sortOrder),
      asc(productCategoryInstruction.label),
    )

  const out: Record<string, PosCategoryInstruction[]> = {}
  for (const r of rows) {
    const list = out[r.categoryId] ?? []
    list.push({
      id: r.row.id,
      label: r.row.label,
      sortOrder: r.row.sortOrder,
    })
    out[r.categoryId] = list
  }
  return out
}

export type InventoryItemWithStock = {
  item: typeof inventoryItem.$inferSelect
  stock: number
}

export async function listInventoryItemsWithStock(organizationId: string): Promise<InventoryItemWithStock[]> {
  const db = getDb()
  const items = await db
    .select()
    .from(inventoryItem)
    .where(eq(inventoryItem.organizationId, organizationId))
    .orderBy(asc(inventoryItem.name))

  if (items.length === 0) return []

  const ids = items.map((i) => i.id)
  const stocks = await db
    .select()
    .from(inventoryStock)
    .where(and(eq(inventoryStock.organizationId, organizationId), inArray(inventoryStock.inventoryItemId, ids)))

  const qtyByItem = new Map<string, number>()
  for (const s of stocks) {
    qtyByItem.set(s.inventoryItemId, s.quantity)
  }

  return items.map((item) => ({
    item,
    stock: qtyByItem.get(item.id) ?? 0,
  }))
}

/**
 * Paginated inventory list; `search` matches **name** or **unit** (case-insensitive).
 */
export async function listInventoryItemsWithStockPage(
  organizationId: string,
  search: string,
  page: number,
  pageSize: number,
): Promise<{ rows: InventoryItemWithStock[]; total: number }> {
  const db = getDb()
  const whereClause = buildInventoryListWhere(organizationId, search)
  const p = Math.max(1, page)
  const ps = Math.max(1, pageSize)
  const offset = (p - 1) * ps

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
    .from(inventoryItem)
    .where(whereClause)

  const total = countRow?.n ?? 0

  const items = await db
    .select()
    .from(inventoryItem)
    .where(whereClause)
    .orderBy(asc(inventoryItem.name))
    .limit(ps)
    .offset(offset)

  if (items.length === 0) {
    return { rows: [], total }
  }

  const ids = items.map((i) => i.id)
  const stocks = await db
    .select()
    .from(inventoryStock)
    .where(and(eq(inventoryStock.organizationId, organizationId), inArray(inventoryStock.inventoryItemId, ids)))

  const qtyByItem = new Map<string, number>()
  for (const s of stocks) {
    qtyByItem.set(s.inventoryItemId, s.quantity)
  }

  const rows = items.map((item) => ({
    item,
    stock: qtyByItem.get(item.id) ?? 0,
  }))
  return { rows, total }
}

export type ProductListRow = {
  product: typeof product.$inferSelect
  categoryName: string
  priceCount: number
  /** Branch names when `selected_locations_only`; empty when all branches. */
  locationNames: string[]
  /** First recipe line: `Item × qty` or null. */
  firstIngredientPreview: string | null
  ingredientCount: number
}

export type CatalogProductsListFilters = {
  /** Trimmed free-text; empty = no filter */
  search: string
  /** Empty string = all categories */
  categoryId: string
}

function buildCatalogProductListWhere(organizationId: string, filters: CatalogProductsListFilters): SQL {
  const parts: SQL[] = [eq(product.organizationId, organizationId)]
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

type ProductListBaseRow = {
  product: typeof product.$inferSelect
  categoryName: string
  priceCount: number
}

async function hydrateProductListRows(
  organizationId: string,
  baseRows: ProductListBaseRow[],
): Promise<ProductListRow[]> {
  if (baseRows.length === 0) return []
  const db = getDb()
  const productIds = baseRows.map((r) => r.product.id)

  const [locRows, ingRows] = await Promise.all([
    db
      .select({
        productId: productLocation.productId,
        locationName: businessLocation.name,
      })
      .from(productLocation)
      .innerJoin(businessLocation, eq(productLocation.locationId, businessLocation.id))
      .where(
        and(eq(businessLocation.organizationId, organizationId), inArray(productLocation.productId, productIds)),
      ),
    db
      .select({
        productId: productIngredient.productId,
        itemName: inventoryItem.name,
        quantityMilli: productIngredient.quantityMilli,
        lineId: productIngredient.id,
      })
      .from(productIngredient)
      .innerJoin(inventoryItem, eq(productIngredient.inventoryItemId, inventoryItem.id))
      .where(
        and(eq(inventoryItem.organizationId, organizationId), inArray(productIngredient.productId, productIds)),
      )
      .orderBy(asc(productIngredient.id)),
  ])

  const locationNamesByProduct = new Map<string, string[]>()
  for (const r of locRows) {
    const list = locationNamesByProduct.get(r.productId) ?? []
    list.push(r.locationName)
    locationNamesByProduct.set(r.productId, list)
  }
  for (const names of locationNamesByProduct.values()) {
    names.sort((a, b) => a.localeCompare(b))
  }

  const ingredientsByProduct = new Map<
    string,
    { itemName: string; quantityMilli: number; lineId: string }[]
  >()
  for (const r of ingRows) {
    const list = ingredientsByProduct.get(r.productId) ?? []
    list.push({ itemName: r.itemName, quantityMilli: r.quantityMilli, lineId: r.lineId })
    ingredientsByProduct.set(r.productId, list)
  }

  return baseRows.map((r) => {
    const pid = r.product.id
    const ingList = ingredientsByProduct.get(pid) ?? []
    const first = ingList[0]
    const firstIngredientPreview = first
      ? `${first.itemName} × ${formatMilliToDecimal3(first.quantityMilli)}`
      : null
    return {
      product: r.product,
      categoryName: r.categoryName,
      priceCount: r.priceCount,
      locationNames: locationNamesByProduct.get(pid) ?? [],
      firstIngredientPreview,
      ingredientCount: ingList.length,
    }
  })
}

const productListPriceCountSql = sql<number>`(
  select count(*)::int
  from product_price
  where product_price.product_id = ${product.id}
)`
  .mapWith(Number)
  .as("price_count")

/**
 * Paginated product list with server-side filters (`search` ILIKE on name, category, SKU, QR payload).
 */
export async function listCatalogProductsPage(
  organizationId: string,
  filters: CatalogProductsListFilters,
  page: number,
  pageSize: number,
): Promise<{ rows: ProductListRow[]; total: number }> {
  const db = getDb()
  const whereClause = buildCatalogProductListWhere(organizationId, filters)
  const p = Math.max(1, page)
  const ps = Math.max(1, pageSize)
  const offset = (p - 1) * ps

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
    .from(product)
    .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
    .where(whereClause)

  const total = countRow?.n ?? 0

  const baseRows = await db
    .select({
      product,
      categoryName: productCategory.name,
      priceCount: productListPriceCountSql,
    })
    .from(product)
    .innerJoin(productCategory, eq(product.categoryId, productCategory.id))
    .where(whereClause)
    .orderBy(asc(product.name))
    .limit(ps)
    .offset(offset)

  const rows = await hydrateProductListRows(organizationId, baseRows)
  return { rows, total }
}

export async function getProductDetailForOrganization(organizationId: string, productId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.organizationId, organizationId), eq(product.id, productId)))
    .limit(1)
  if (!row) return null

  const [prices, locs, ings] = await Promise.all([
    db
      .select()
      .from(productPrice)
      .where(eq(productPrice.productId, productId))
      .orderBy(asc(productPrice.sortOrder), asc(productPrice.label)),
    db.select().from(productLocation).where(eq(productLocation.productId, productId)),
    db
      .select({
        ingredient: productIngredient,
        itemName: inventoryItem.name,
        unit: inventoryItem.unit,
        costPerUnitMinor: inventoryItem.costPerUnitMinor,
      })
      .from(productIngredient)
      .innerJoin(inventoryItem, eq(productIngredient.inventoryItemId, inventoryItem.id))
      .where(eq(productIngredient.productId, productId)),
  ])

  return { product: row, prices, locations: locs, ingredients: ings }
}

/** Products visible at a branch for POS (Phase 3); cashiers may call read path. */
export async function listSellableProductIdsForLocation(organizationId: string, locationId: string) {
  const db = getDb()
  const all = await db
    .select({ id: product.id, mode: product.availabilityMode })
    .from(product)
    .where(and(eq(product.organizationId, organizationId), eq(product.isActive, true)))

  const withLoc = await db
    .select({ productId: productLocation.productId })
    .from(productLocation)
    .innerJoin(product, eq(productLocation.productId, product.id))
    .where(
      and(
        eq(productLocation.locationId, locationId),
        eq(product.organizationId, organizationId),
      ),
    )

  const allowedLoc = new Set(withLoc.map((w) => w.productId))

  return all
    .filter((p) => p.mode === "all_locations" || allowedLoc.has(p.id))
    .map((p) => p.id)
}

export type BelowReorderRow = {
  itemId: string
  name: string
  quantity: number
  reorderPoint: number
}

/** Items at or below `reorder_point` (organization-wide stock). */
export async function listInventoryBelowReorder(organizationId: string): Promise<BelowReorderRow[]> {
  const db = getDb()
  const raw = await db
    .select({
      itemId: inventoryItem.id,
      name: inventoryItem.name,
      quantity: inventoryStock.quantity,
      reorderPoint: inventoryItem.reorderPoint,
    })
    .from(inventoryItem)
    .innerJoin(
      inventoryStock,
      and(
        eq(inventoryStock.inventoryItemId, inventoryItem.id),
        eq(inventoryStock.organizationId, organizationId),
      ),
    )
    .where(
      and(
        eq(inventoryItem.organizationId, organizationId),
        isNotNull(inventoryItem.reorderPoint),
        lte(inventoryStock.quantity, inventoryItem.reorderPoint),
      ),
    )
    .orderBy(asc(inventoryItem.name))

  return raw
    .filter((r): r is typeof r & { reorderPoint: number } => r.reorderPoint != null)
    .map((r) => ({
      itemId: r.itemId,
      name: r.name,
      quantity: r.quantity,
      reorderPoint: r.reorderPoint,
    }))
}
