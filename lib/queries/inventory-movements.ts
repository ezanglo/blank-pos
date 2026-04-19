import { and, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { user } from "@/lib/db/auth-schema"
import { businessLocation } from "@/lib/db/schema-app"
import { inventoryItem } from "@/lib/db/schema-catalog"
import { inventoryMovements, type InventoryMovementType } from "@/lib/db/schema-inventory-movements"
import { posTransactionItems, posTransactions } from "@/lib/db/schema-transactions"

function escapeLikeMeta(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

export type InventoryMovementListRow = {
  movement: typeof inventoryMovements.$inferSelect
  itemName: string
  transactionId: string | null
  /** Branch slug for receipt link when `transactionId` is set. */
  locationSlug: string | null
  actorName: string | null
}

export type InventoryMovementListFilters = {
  type: InventoryMovementType | ""
  search: string
  dateFrom: string
  dateTo: string
  page: number
  pageSize: number
}

function parseDayStartUtc(isoDate: string): Date | null {
  const t = isoDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return new Date(`${t}T00:00:00.000Z`)
}

function parseDayEndUtc(isoDate: string): Date | null {
  const t = isoDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return new Date(`${t}T23:59:59.999Z`)
}

export async function listInventoryMovementsPage(
  organizationId: string,
  filters: InventoryMovementListFilters,
): Promise<{ rows: InventoryMovementListRow[]; total: number }> {
  const db = getDb()
  const parts: SQL[] = [eq(inventoryMovements.organizationId, organizationId)]

  if (filters.type === "in" || filters.type === "out" || filters.type === "adjustment") {
    parts.push(eq(inventoryMovements.type, filters.type))
  }

  const from = filters.dateFrom ? parseDayStartUtc(filters.dateFrom) : null
  if (from) parts.push(gte(inventoryMovements.createdAt, from))
  const to = filters.dateTo ? parseDayEndUtc(filters.dateTo) : null
  if (to) parts.push(lte(inventoryMovements.createdAt, to))

  const rawSearch = filters.search.trim()
  if (rawSearch.length > 0) {
    const pattern = `%${escapeLikeMeta(rawSearch)}%`
    parts.push(
      or(ilike(inventoryItem.name, pattern), ilike(sql<string>`COALESCE(${inventoryMovements.note}, '')`, pattern))!,
    )
  }

  const whereClause = and(...parts)!

  const [{ total }] = await db
    .select({ total: count() })
    .from(inventoryMovements)
    .innerJoin(inventoryItem, eq(inventoryItem.id, inventoryMovements.inventoryItemId))
    .where(whereClause)

  const offset = (filters.page - 1) * filters.pageSize

  const baseRows = await db
    .select({
      movement: inventoryMovements,
      itemName: inventoryItem.name,
      transactionId: posTransactions.id,
      locationSlug: businessLocation.slug,
      actorName: user.name,
    })
    .from(inventoryMovements)
    .innerJoin(inventoryItem, eq(inventoryItem.id, inventoryMovements.inventoryItemId))
    .leftJoin(posTransactionItems, eq(posTransactionItems.id, inventoryMovements.referenceId))
    .leftJoin(posTransactions, eq(posTransactions.id, posTransactionItems.transactionId))
    .leftJoin(businessLocation, eq(businessLocation.id, posTransactions.locationId))
    .leftJoin(user, eq(user.id, inventoryMovements.userId))
    .where(whereClause)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(filters.pageSize)
    .offset(offset)

  return {
    rows: baseRows.map((r) => ({
      movement: r.movement,
      itemName: r.itemName,
      transactionId: r.transactionId,
      locationSlug: r.locationSlug,
      actorName: r.actorName,
    })),
    total: Number(total),
  }
}
