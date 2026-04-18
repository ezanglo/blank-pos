"use server"

import { randomUUID } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"
import type { z } from "zod"

import { requireCatalogManager, requireCatalogMember } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { businessLocation } from "@/lib/db/schema-app"
import {
  inventoryItem,
  product,
  productCategory,
  productCategoryVariant,
  productIngredient,
  productLocation,
  productPrice,
} from "@/lib/db/schema-catalog"
import {
  formatMilliToDecimal3,
  formatMinorToDecimal2,
  parseDecimal2ToMinor,
  parseDecimal3ToMilli,
} from "@/lib/money"
import { getProductDetailForOrganization, listSellableProductIdsForLocation } from "@/lib/queries/catalog"
import { getDefaultCatalogCurrencyCode } from "@/lib/queries/catalog-currency"
import { getLocationByIdForOrganization } from "@/lib/queries/location"
import {
  catalogProductCreateSchema,
  catalogProductRecipeSaveSchema,
  catalogProductUpdateSchema,
} from "@/lib/schemas/catalog"

type RawPriceInput = z.infer<typeof catalogProductCreateSchema>["prices"][number]

type PriceResolved = {
  label: string
  amountMinor: bigint
  isDefault: boolean
  sortOrder: number
  categoryVariantId: string
}

async function resolveProductPricesInput(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exec: any,
  categoryId: string,
  rawPrices: RawPriceInput[],
): Promise<PriceResolved[]> {
  const seenVariant = new Set<string>()
  const out: PriceResolved[] = []
  for (const p of rawPrices) {
    const vid = p.categoryVariantId?.trim()
    if (!vid) throw new Error("Each price must use a variant.")
    if (seenVariant.has(vid)) throw new Error("Each variant can only be used once per product.")
    seenVariant.add(vid)
    const [v] = await exec
      .select()
      .from(productCategoryVariant)
      .where(and(eq(productCategoryVariant.id, vid), eq(productCategoryVariant.categoryId, categoryId)))
      .limit(1)
    if (!v) throw new Error("Invalid variant for this product category.")
    const amountMinor = parseDecimal2ToMinor(p.amount)
    const isDefault = p.isDefault ?? false
    out.push({
      label: v.label,
      amountMinor,
      isDefault,
      sortOrder: v.sortOrder,
      categoryVariantId: v.id,
    })
  }
  return out
}

function normalizeSku(s: string | null | undefined) {
  const t = s?.trim()
  return t === "" || t == null ? null : t
}

async function assertLocationIdsForOrg(
  db: ReturnType<typeof getDb>,
  organizationId: string,
  ids: string[],
) {
  if (ids.length === 0) return
  const rows = await db
    .select({ id: businessLocation.id })
    .from(businessLocation)
    .where(and(eq(businessLocation.organizationId, organizationId), inArray(businessLocation.id, ids)))
  if (rows.length !== ids.length) throw new Error("One or more branches are invalid for this business.")
}

export async function createProduct(businessSlug: string, raw: z.input<typeof catalogProductCreateSchema>) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogProductCreateSchema.parse(raw)
  const db = getDb()

  const [cat] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(
      and(eq(productCategory.id, input.categoryId), eq(productCategory.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!cat) throw new Error("Category not found.")

  if (input.availabilityMode === "selected_locations_only") {
    const locIds = input.locationIds ?? []
    if (locIds.length === 0) throw new Error("Select at least one branch, or choose “All locations”.")
    await assertLocationIdsForOrg(db, ctx.organization.id, locIds)
  }

  const currency = await getDefaultCatalogCurrencyCode(ctx.organization.id)

  const productId = randomUUID()
  const now = new Date()
  const sku = normalizeSku(input.sku)
  const qrCode = normalizeSku(input.qrCode)

  try {
    await db.transaction(async (tx) => {
      await tx.insert(product).values({
        id: productId,
        organizationId: ctx.organization.id,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description?.trim() || null,
        sku,
        qrCode,
        imageUrl: input.imageUrl ?? null,
        isActive: input.isActive ?? true,
        isComposite: input.isComposite ?? false,
        trackInventory: true,
        availabilityMode: input.availabilityMode,
        createdAt: now,
        updatedAt: now,
      })

      if (input.availabilityMode === "selected_locations_only") {
        for (const lid of input.locationIds ?? []) {
          await tx.insert(productLocation).values({
            id: randomUUID(),
            productId,
            locationId: lid,
          })
        }
      }

      if (input.prices.length > 0) {
        const pricesResolved = await resolveProductPricesInput(tx, input.categoryId, input.prices)
        if (!pricesResolved.some((p) => p.isDefault) && pricesResolved.length > 0) {
          pricesResolved[0] = { ...pricesResolved[0], isDefault: true }
        }
        for (const p of pricesResolved) {
          await tx.insert(productPrice).values({
            id: randomUUID(),
            productId,
            label: p.label,
            amountMinor: p.amountMinor,
            currency,
            isDefault: p.isDefault,
            sortOrder: p.sortOrder,
            categoryVariantId: p.categoryVariantId,
            createdAt: now,
          })
        }
      }

      if (input.isComposite) {
        for (const line of input.ingredients ?? []) {
          const milli = parseDecimal3ToMilli(line.quantity)
          const [ii] = await tx
            .select({ id: inventoryItem.id })
            .from(inventoryItem)
            .where(
              and(
                eq(inventoryItem.id, line.inventoryItemId),
                eq(inventoryItem.organizationId, ctx.organization.id),
              ),
            )
            .limit(1)
          if (!ii) throw new Error("Ingredient item not found.")
          await tx.insert(productIngredient).values({
            id: randomUUID(),
            productId,
            inventoryItemId: line.inventoryItemId,
            quantityMilli: milli,
          })
        }
      }
    })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "23505") throw new Error("That SKU is already used for another product in this business.")
    throw e
  }

  return { ok: true as const, id: productId }
}

export async function updateProduct(businessSlug: string, raw: z.input<typeof catalogProductUpdateSchema>) {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogProductUpdateSchema.parse(raw)
  const db = getDb()

  const [existing] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, input.id), eq(product.organizationId, ctx.organization.id)))
    .limit(1)
  if (!existing) throw new Error("Product not found.")

  const [cat] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(
      and(eq(productCategory.id, input.categoryId), eq(productCategory.organizationId, ctx.organization.id)),
    )
    .limit(1)
  if (!cat) throw new Error("Category not found.")

  if (input.availabilityMode === "selected_locations_only") {
    const locIds = input.locationIds ?? []
    if (locIds.length === 0) throw new Error("Select at least one branch, or choose “All locations”.")
    await assertLocationIdsForOrg(db, ctx.organization.id, locIds)
  }

  const currency = await getDefaultCatalogCurrencyCode(ctx.organization.id)

  const now = new Date()
  const sku = normalizeSku(input.sku)
  const qrCode = normalizeSku(input.qrCode)

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(product)
        .set({
          categoryId: input.categoryId,
          name: input.name,
          description: input.description?.trim() || null,
          sku,
          qrCode,
          imageUrl: input.imageUrl ?? null,
          isActive: input.isActive ?? true,
          ...(input.isComposite !== undefined ? { isComposite: input.isComposite } : {}),
          trackInventory: true,
          availabilityMode: input.availabilityMode,
          updatedAt: now,
        })
        .where(eq(product.id, input.id))

      await tx.delete(productLocation).where(eq(productLocation.productId, input.id))
      if (input.availabilityMode === "selected_locations_only") {
        for (const lid of input.locationIds ?? []) {
          await tx.insert(productLocation).values({
            id: randomUUID(),
            productId: input.id,
            locationId: lid,
          })
        }
      }

      if (input.prices !== undefined) {
        await tx.delete(productPrice).where(eq(productPrice.productId, input.id))
        if (input.prices.length > 0) {
          const pricesResolved = await resolveProductPricesInput(tx, input.categoryId, input.prices)
          if (!pricesResolved.some((p) => p.isDefault) && pricesResolved.length > 0) {
            pricesResolved[0] = { ...pricesResolved[0], isDefault: true }
          }
          for (const p of pricesResolved) {
            await tx.insert(productPrice).values({
              id: randomUUID(),
              productId: input.id,
              label: p.label,
              amountMinor: p.amountMinor,
              currency,
              isDefault: p.isDefault,
              sortOrder: p.sortOrder,
              categoryVariantId: p.categoryVariantId,
              createdAt: now,
            })
          }
        }
      }
    })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === "23505") throw new Error("That SKU is already used for another product in this business.")
    throw e
  }

  return { ok: true as const }
}

export async function saveProductRecipe(
  businessSlug: string,
  raw: z.input<typeof catalogProductRecipeSaveSchema>,
): Promise<{ ok: true; ingredients: { inventoryItemId: string; quantity: string }[] }> {
  const ctx = await requireCatalogManager(businessSlug)
  const input = catalogProductRecipeSaveSchema.parse(raw)
  const db = getDb()

  const [existing] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, input.productId), eq(product.organizationId, ctx.organization.id)))
    .limit(1)
  if (!existing) throw new Error("Product not found.")

  const cleaned = input.ingredients.filter((line) => line.inventoryItemId.trim().length > 0)
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx.delete(productIngredient).where(eq(productIngredient.productId, input.productId))
    for (const line of cleaned) {
      const milli = parseDecimal3ToMilli(line.quantity)
      const [ii] = await tx
        .select({ id: inventoryItem.id })
        .from(inventoryItem)
        .where(
          and(eq(inventoryItem.id, line.inventoryItemId), eq(inventoryItem.organizationId, ctx.organization.id)),
        )
        .limit(1)
      if (!ii) throw new Error("Ingredient item not found.")
      await tx.insert(productIngredient).values({
        id: randomUUID(),
        productId: input.productId,
        inventoryItemId: line.inventoryItemId,
        quantityMilli: milli,
      })
    }
    await tx
      .update(product)
      .set({
        isComposite: cleaned.length > 0,
        updatedAt: now,
      })
      .where(eq(product.id, input.productId))
  })

  return {
    ok: true as const,
    ingredients: cleaned.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: l.quantity })),
  }
}

export async function deleteProduct(businessSlug: string, productId: string) {
  const ctx = await requireCatalogManager(businessSlug)
  const db = getDb()
  const [row] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.organizationId, ctx.organization.id)))
    .limit(1)
  if (!row) throw new Error("Product not found.")
  await db.delete(product).where(eq(product.id, productId))
  return { ok: true as const }
}

export type ProductDetailDTO = {
  product: {
    id: string
    categoryId: string
    name: string
    description: string | null
    sku: string | null
    qrCode: string | null
    imageUrl: string | null
    isActive: boolean
    isComposite: boolean
    trackInventory: boolean
    availabilityMode: string
  }
  prices: {
    id: string
    label: string
    amount: string
    isDefault: boolean
    sortOrder: number
    categoryVariantId: string | null
  }[]
  locationIds: string[]
  ingredients: { inventoryItemId: string; quantity: string }[]
}

export async function getProductDetailForEdit(
  businessSlug: string,
  productId: string,
): Promise<ProductDetailDTO | null> {
  const ctx = await requireCatalogMember(businessSlug)
  const d = await getProductDetailForOrganization(ctx.organization.id, productId)
  if (!d) return null
  return {
    product: {
      id: d.product.id,
      categoryId: d.product.categoryId,
      name: d.product.name,
      description: d.product.description,
      sku: d.product.sku,
      qrCode: d.product.qrCode,
      imageUrl: d.product.imageUrl,
      isActive: d.product.isActive,
      isComposite: d.product.isComposite,
      trackInventory: d.product.trackInventory,
      availabilityMode: d.product.availabilityMode,
    },
    prices: d.prices.map((p) => ({
      id: p.id,
      label: p.label,
      amount: formatMinorToDecimal2(p.amountMinor),
      isDefault: p.isDefault,
      sortOrder: p.sortOrder,
      categoryVariantId: p.categoryVariantId ?? null,
    })),
    locationIds: d.locations.map((l) => l.locationId),
    ingredients: d.ingredients.map((r) => ({
      inventoryItemId: r.ingredient.inventoryItemId,
      quantity: formatMilliToDecimal3(r.ingredient.quantityMilli),
    })),
  }
}

export async function listSellableProductIdsAtLocation(businessSlug: string, locationId: string) {
  const ctx = await requireCatalogMember(businessSlug)
  const loc = await getLocationByIdForOrganization(ctx.organization.id, locationId)
  if (!loc) throw new Error("Forbidden")
  const ids = await listSellableProductIdsForLocation(ctx.organization.id, locationId)
  return { ids }
}
