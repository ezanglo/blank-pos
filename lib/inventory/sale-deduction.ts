/**
 * Composite sale → `inventory_movements` (`out`) + `inventory_stock` updates.
 * Deducted units per line per ingredient: floor(lineQty × quantity_milli / 1000) — integer stock, no over-consumption from rounding.
 */
import { randomUUID } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import {
  inventoryStock,
  product,
  productIngredient,
} from "@/lib/db/schema-catalog"
import { inventoryMovements } from "@/lib/db/schema-inventory-movements"
import { posTransactionItems } from "@/lib/db/schema-transactions"

type Db = ReturnType<typeof getDb>
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0]

export class InsufficientInventoryError extends Error {
  readonly code = "insufficient_inventory" as const
  constructor(message: string) {
    super(message)
    this.name = "InsufficientInventoryError"
  }
}

export type SaleLineRow = {
  transactionItemId: string
  productId: string
  quantity: number
}

export async function applyInventoryDeductionForTransaction(
  tx: DbTransaction,
  params: {
    organizationId: string
    transactionId: string
    userId: string
    lines: SaleLineRow[]
  },
): Promise<void> {
  const { organizationId, transactionId, userId, lines } = params
  const productIds = [...new Set(lines.map((l) => l.productId))]
  const compositeByProductId = await loadIsCompositeByProductId(tx, organizationId, productIds)

  const [already] = await tx
    .select({ id: inventoryMovements.id })
    .from(inventoryMovements)
    .innerJoin(posTransactionItems, eq(inventoryMovements.referenceId, posTransactionItems.id))
    .where(
      and(
        eq(posTransactionItems.transactionId, transactionId),
        eq(inventoryMovements.type, "out"),
        eq(inventoryMovements.organizationId, organizationId),
      ),
    )
    .limit(1)

  if (already) return

  type Deduction = { transactionItemId: string; inventoryItemId: string; qty: number }
  const deductions: Deduction[] = []

  const productIdsNeedingIngredients = [
    ...new Set(
      lines.filter((l) => compositeByProductId.get(l.productId) === true).map((l) => l.productId),
    ),
  ]

  if (productIdsNeedingIngredients.length === 0) return

  const ingredients =
    productIdsNeedingIngredients.length > 0
      ? await tx
          .select()
          .from(productIngredient)
          .where(inArray(productIngredient.productId, productIdsNeedingIngredients))
      : []

  const ingredientsByProduct = new Map<string, typeof productIngredient.$inferSelect[]>()
  for (const ing of ingredients) {
    const list = ingredientsByProduct.get(ing.productId) ?? []
    list.push(ing)
    ingredientsByProduct.set(ing.productId, list)
  }

  for (const line of lines) {
    if (!compositeByProductId.get(line.productId)) continue
    const ings = ingredientsByProduct.get(line.productId) ?? []
    for (const ing of ings) {
      const qty = Math.floor((line.quantity * ing.quantityMilli) / 1000)
      if (qty <= 0) continue
      deductions.push({
        transactionItemId: line.transactionItemId,
        inventoryItemId: ing.inventoryItemId,
        qty,
      })
    }
  }

  if (deductions.length === 0) return

  const mergedByLineAndItem = new Map<string, Deduction>()
  for (const d of deductions) {
    const k = `${d.transactionItemId}:${d.inventoryItemId}`
    const prev = mergedByLineAndItem.get(k)
    if (prev) prev.qty += d.qty
    else mergedByLineAndItem.set(k, { ...d })
  }
  const mergedDeductions = [...mergedByLineAndItem.values()]

  const requiredByItem = new Map<string, number>()
  for (const d of mergedDeductions) {
    requiredByItem.set(d.inventoryItemId, (requiredByItem.get(d.inventoryItemId) ?? 0) + d.qty)
  }

  const sortedItemIds = [...requiredByItem.keys()].sort()

  const stockRows = await tx
    .select()
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.organizationId, organizationId),
        inArray(inventoryStock.inventoryItemId, sortedItemIds),
      ),
    )
    .for("update")

  const stockByItemId = new Map(stockRows.map((s) => [s.inventoryItemId, s]))

  for (const inventoryItemId of sortedItemIds) {
    const need = requiredByItem.get(inventoryItemId) ?? 0
    const row = stockByItemId.get(inventoryItemId)
    const have = row?.quantity ?? 0
    if (have < need) {
      throw new InsufficientInventoryError(
        "Not enough stock for one or more recipe ingredients. Reduce the quantity or update inventory.",
      )
    }
  }

  const now = new Date()
  for (const d of mergedDeductions) {
    await tx.insert(inventoryMovements).values({
      id: randomUUID(),
      organizationId,
      inventoryItemId: d.inventoryItemId,
      type: "out",
      quantity: d.qty,
      referenceId: d.transactionItemId,
      note: null,
      userId,
      createdAt: now,
    })
  }

  for (const inventoryItemId of sortedItemIds) {
    const need = requiredByItem.get(inventoryItemId) ?? 0
    const row = stockByItemId.get(inventoryItemId)
    if (!row) {
      throw new InsufficientInventoryError("Missing stock row for a recipe ingredient.")
    }
    await tx
      .update(inventoryStock)
      .set({
        quantity: row.quantity - need,
        updatedAt: now,
      })
      .where(eq(inventoryStock.id, row.id))
  }
}

/** Re-fetch composite flags inside a transaction (optional safety). */
export async function loadIsCompositeByProductId(
  tx: DbTransaction,
  organizationId: string,
  productIds: string[],
): Promise<Map<string, boolean>> {
  if (productIds.length === 0) return new Map()
  const rows = await tx
    .select({ id: product.id, isComposite: product.isComposite })
    .from(product)
    .where(and(eq(product.organizationId, organizationId), inArray(product.id, productIds)))
  return new Map(rows.map((r) => [r.id, r.isComposite]))
}
