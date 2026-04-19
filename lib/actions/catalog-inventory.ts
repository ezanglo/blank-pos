"use server"

import { randomUUID } from "node:crypto"

import { and, count, eq } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { inventoryItem, inventoryStock, productIngredient } from "@/lib/db/schema-catalog"
import { inventoryMovements } from "@/lib/db/schema-inventory-movements"
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
    if (qty > 0) {
      await tx.insert(inventoryMovements).values({
        id: randomUUID(),
        organizationId: ctx.organization.id,
        inventoryItemId: itemId,
        type: "in",
        quantity: qty,
        referenceId: null,
        note: "Initial stock",
        userId: ctx.member.userId,
        createdAt: now,
      })
    }
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

  const newQty = input.quantity
  const now = new Date()

  await db.transaction(async (tx) => {
    const [stock] = await tx
      .select()
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.inventoryItemId, input.inventoryItemId),
          eq(inventoryStock.organizationId, ctx.organization.id),
        ),
      )
      .for("update")

    const oldQty = stock?.quantity ?? 0
    const delta = newQty - oldQty

    if (delta !== 0) {
      await tx.insert(inventoryMovements).values({
        id: randomUUID(),
        organizationId: ctx.organization.id,
        inventoryItemId: input.inventoryItemId,
        type: "adjustment",
        quantity: delta,
        referenceId: null,
        note: `Stock set to ${newQty} (was ${oldQty})`,
        userId: ctx.member.userId,
        createdAt: now,
      })
    }

    if (stock) {
      await tx
        .update(inventoryStock)
        .set({ quantity: newQty, updatedAt: now })
        .where(eq(inventoryStock.id, stock.id))
    } else if (newQty > 0) {
      await tx.insert(inventoryStock).values({
        id: randomUUID(),
        inventoryItemId: input.inventoryItemId,
        organizationId: ctx.organization.id,
        quantity: newQty,
        updatedAt: now,
      })
    }
  })

  return { ok: true as const }
}

/** Signed delta adjustment with a required reason (audit). */
export async function recordInventoryAdjustment(
  businessSlug: string,
  input: { inventoryItemId: string; delta: number; note: string },
) {
  const ctx = await requireCatalogManager(businessSlug)
  const note = input.note.trim()
  if (note.length === 0) throw new Error("Reason is required.")
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new Error("Delta must be a non-zero integer.")
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

  const now = new Date()

  await db.transaction(async (tx) => {
    const [stock] = await tx
      .select()
      .from(inventoryStock)
      .where(
        and(
          eq(inventoryStock.inventoryItemId, input.inventoryItemId),
          eq(inventoryStock.organizationId, ctx.organization.id),
        ),
      )
      .for("update")

    const oldQty = stock?.quantity ?? 0
    const newQty = oldQty + input.delta
    if (newQty < 0) throw new Error("Adjustment would make stock negative.")

    await tx.insert(inventoryMovements).values({
      id: randomUUID(),
      organizationId: ctx.organization.id,
      inventoryItemId: input.inventoryItemId,
      type: "adjustment",
      quantity: input.delta,
      referenceId: null,
      note,
      userId: ctx.member.userId,
      createdAt: now,
    })

    if (stock) {
      await tx
        .update(inventoryStock)
        .set({ quantity: newQty, updatedAt: now })
        .where(eq(inventoryStock.id, stock.id))
    } else {
      await tx.insert(inventoryStock).values({
        id: randomUUID(),
        inventoryItemId: input.inventoryItemId,
        organizationId: ctx.organization.id,
        quantity: newQty,
        updatedAt: now,
      })
    }
  })

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
