"use server"

import { randomUUID } from "node:crypto"

import { and, asc, eq, ne } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { product, productCategoryVariant, productPrice } from "@/lib/db/schema-catalog"
import { parseDecimal2ToMinor } from "@/lib/money"
import { getDefaultCatalogCurrencyCode } from "@/lib/queries/catalog-currency"
import {
  catalogProductPriceLineCreateSchema,
  catalogProductPriceLineUpdateSchema,
} from "@/lib/schemas/catalog"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = any

async function assertProductInOrg(db: ReturnType<typeof getDb>, organizationId: string, productId: string) {
  const [row] = await db
    .select({ id: product.id, categoryId: product.categoryId })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.organizationId, organizationId)))
    .limit(1)
  if (!row) throw new Error("Product not found.")
  return row
}

async function resolveFromVariant(exec: DbLike, categoryId: string, variantId: string, amount: string) {
  const vid = variantId.trim()
  const amountMinor = parseDecimal2ToMinor(amount)
  const [v] = await exec
    .select()
    .from(productCategoryVariant)
    .where(and(eq(productCategoryVariant.id, vid), eq(productCategoryVariant.categoryId, categoryId)))
    .limit(1)
  if (!v) throw new Error("Invalid variant for this product’s category.")
  return {
    label: v.label,
    amountMinor,
    sortOrder: v.sortOrder,
    categoryVariantId: v.id,
  }
}

async function clearDefaultsForProduct(tx: DbLike, productId: string) {
  await tx.update(productPrice).set({ isDefault: false }).where(eq(productPrice.productId, productId))
}

async function ensureOneDefault(tx: DbLike, productId: string) {
  const rows = await tx
    .select()
    .from(productPrice)
    .where(eq(productPrice.productId, productId))
    .orderBy(asc(productPrice.sortOrder), asc(productPrice.label))
  if (rows.length === 0) return
  if (rows.some((r: { isDefault: boolean }) => r.isDefault)) return
  await tx.update(productPrice).set({ isDefault: true }).where(eq(productPrice.id, rows[0].id))
}

export async function createProductPrice(
  businessSlug: string,
  raw: z.input<typeof catalogProductPriceLineCreateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogProductPriceLineCreateSchema.parse(raw)
  const db = getDb()
  const pRow = await assertProductInOrg(db, ctx.organization.id, input.productId)

  const [dup] = await db
    .select({ id: productPrice.id })
    .from(productPrice)
    .where(
      and(eq(productPrice.productId, input.productId), eq(productPrice.categoryVariantId, input.categoryVariantId)),
    )
    .limit(1)
  if (dup) throw new Error("This variant already has a price on this product.")

  const currency = await getDefaultCatalogCurrencyCode(ctx.organization.id)
  const now = new Date()

  await db.transaction(async (tx) => {
    const existing = await tx.select().from(productPrice).where(eq(productPrice.productId, input.productId))
    const isFirst = existing.length === 0

    const resolved = await resolveFromVariant(tx, pRow.categoryId, input.categoryVariantId, input.amount)

    const wantsDefault = isFirst || input.isDefault === true
    if (wantsDefault) {
      await clearDefaultsForProduct(tx, input.productId)
    }

    await tx.insert(productPrice).values({
      id: randomUUID(),
      productId: input.productId,
      label: resolved.label,
      amountMinor: resolved.amountMinor,
      currency,
      isDefault: wantsDefault,
      sortOrder: resolved.sortOrder,
      categoryVariantId: resolved.categoryVariantId,
      createdAt: now,
    })
  })

  return { ok: true as const }
}

export async function updateProductPrice(
  businessSlug: string,
  raw: z.input<typeof catalogProductPriceLineUpdateSchema>,
) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogProductPriceLineUpdateSchema.parse(raw)
  const db = getDb()
  const pRow = await assertProductInOrg(db, ctx.organization.id, input.productId)

  const [existing] = await db
    .select()
    .from(productPrice)
    .where(and(eq(productPrice.id, input.id), eq(productPrice.productId, input.productId)))
    .limit(1)
  if (!existing) throw new Error("Price not found.")

  const [dup] = await db
    .select({ id: productPrice.id })
    .from(productPrice)
    .where(
      and(
        eq(productPrice.productId, input.productId),
        eq(productPrice.categoryVariantId, input.categoryVariantId),
        ne(productPrice.id, input.id),
      ),
    )
    .limit(1)
  if (dup) throw new Error("This variant already has another price on this product.")

  const currency = await getDefaultCatalogCurrencyCode(ctx.organization.id)

  await db.transaction(async (tx) => {
    const resolved = await resolveFromVariant(tx, pRow.categoryId, input.categoryVariantId, input.amount)
    const nextDefault = input.isDefault === undefined ? existing.isDefault : input.isDefault

    if (nextDefault) {
      await clearDefaultsForProduct(tx, input.productId)
    }

    await tx
      .update(productPrice)
      .set({
        label: resolved.label,
        amountMinor: resolved.amountMinor,
        currency,
        sortOrder: resolved.sortOrder,
        categoryVariantId: resolved.categoryVariantId,
        isDefault: nextDefault,
      })
      .where(eq(productPrice.id, input.id))

    if (!nextDefault) {
      await ensureOneDefault(tx, input.productId)
    }
  })

  return { ok: true as const }
}

export async function deleteProductPrice(businessSlug: string, productId: string, priceId: string) {
  const ctx = await requireCatalogManager(businessSlug)
  const db = getDb()
  await assertProductInOrg(db, ctx.organization.id, productId)

  const [row] = await db
    .select()
    .from(productPrice)
    .where(and(eq(productPrice.id, priceId), eq(productPrice.productId, productId)))
    .limit(1)
  if (!row) throw new Error("Price not found.")

  await db.transaction(async (tx) => {
    await tx.delete(productPrice).where(eq(productPrice.id, priceId))
    await ensureOneDefault(tx, productId)
  })

  return { ok: true as const }
}
