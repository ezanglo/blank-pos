"use server"

import { randomUUID } from "node:crypto"

import { and, count, eq } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { inventoryItem, inventoryStock, productIngredient } from "@/lib/db/schema-catalog"
import { parseDecimal2ToMinor } from "@/lib/money"
import {
  catalogInventoryItemCreateSchema,
  catalogInventoryItemUpdateSchema,
} from "@/lib/schemas/catalog"

export async function createInventoryItem(
  businessSlug: string,
  raw: z.input<typeof catalogInventoryItemCreateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogInventoryItemCreateSchema.parse(raw)
  const costMinor = parseDecimal2ToMinor(input.costAmount)
  const db = getDb()
  const itemId = randomUUID()
  const stockId = randomUUID()
  const now = new Date()
  const qty = input.initialStock ?? 0

  await db.transaction(async (tx) => {
    await tx.insert(inventoryItem).values({
      id: itemId,
      organizationId: ctx.organization.id,
      name: input.name,
      unit: input.unit,
      costPerUnitMinor: costMinor,
      reorderPoint: input.reorderPoint ?? null,
      createdAt: now,
      updatedAt: now,
    })
    await tx.insert(inventoryStock).values({
      id: stockId,
      inventoryItemId: itemId,
      organizationId: ctx.organization.id,
      quantity: qty,
      updatedAt: now,
    })
  })

  return { ok: true as const, id: itemId }
}

export async function updateInventoryItem(
  businessSlug: string,
  raw: z.input<typeof catalogInventoryItemUpdateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogInventoryItemUpdateSchema.parse(raw)
  const costMinor = parseDecimal2ToMinor(input.costAmount)
  const db = getDb()
  const [row] = await db
    .select({ id: inventoryItem.id })
    .from(inventoryItem)
    .where(
      and(eq(inventoryItem.id, input.id), eq(inventoryItem.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!row) throw new Error("Item not found.")

  const now = new Date()
  await db
    .update(inventoryItem)
    .set({
      name: input.name,
      unit: input.unit,
      costPerUnitMinor: costMinor,
      reorderPoint: input.reorderPoint ?? null,
      updatedAt: now,
    })
    .where(eq(inventoryItem.id, input.id))

  return { ok: true as const }
}

export async function updateInventoryStockQuantity(
  businessSlug: string,
  input: { inventoryItemId: string; quantity: number },
) {
  const ctx = await requireCatalogManager(businessSlug)
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new Error("Quantity must be a non-negative integer.")
  }
  const db = getDb()
  const [item] = await db
    .select({ id: inventoryItem.id })
    .from(inventoryItem)
    .where(
      and(
        eq(inventoryItem.id, input.inventoryItemId),
        eq(inventoryItem.organizationId, ctx.organization.id),
      ),
    )
    .limit(1)
  if (!item) throw new Error("Item not found.")

  const [stock] = await db
    .select()
    .from(inventoryStock)
    .where(
      and(
        eq(inventoryStock.inventoryItemId, input.inventoryItemId),
        eq(inventoryStock.organizationId, ctx.organization.id),
      ),
    )
    .limit(1)

  const now = new Date()
  if (stock) {
    await db
      .update(inventoryStock)
      .set({ quantity: input.quantity, updatedAt: now })
      .where(eq(inventoryStock.id, stock.id))
  } else {
    await db.insert(inventoryStock).values({
      id: randomUUID(),
      inventoryItemId: input.inventoryItemId,
      organizationId: ctx.organization.id,
      quantity: input.quantity,
      updatedAt: now,
    })
  }
  return { ok: true as const }
}

export async function deleteInventoryItem(businessSlug: string, inventoryItemId: string) {
  const ctx = await requireCatalogManager(businessSlug)
  const db = getDb()
  const [item] = await db
    .select({ id: inventoryItem.id })
    .from(inventoryItem)
    .where(
      and(eq(inventoryItem.id, inventoryItemId), eq(inventoryItem.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!item) throw new Error("Item not found.")

  const [cnt] = await db
    .select({ n: count() })
    .from(productIngredient)
    .where(eq(productIngredient.inventoryItemId, inventoryItemId))
  if (Number(cnt?.n ?? 0) > 0) {
    throw new Error("This item is used in a composite recipe. Remove it from products first.")
  }

  await db.delete(inventoryItem).where(eq(inventoryItem.id, inventoryItemId))
  return { ok: true as const }
}
