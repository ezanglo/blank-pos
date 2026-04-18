"use server"

import { randomUUID } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"

import { requireCatalogMember } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import { product, productPrice } from "@/lib/db/schema-catalog"
import { posTransactionItems, posTransactions } from "@/lib/db/schema-transactions"
import { listSellableProductIdsForLocation } from "@/lib/queries/catalog"
import { getLocationByOrganizationAndSlug } from "@/lib/queries/location"
import { findTransactionIdByCheckoutId } from "@/lib/queries/transactions"
import { createSaleInputSchema } from "@/lib/schemas/sales"
import { sumMinor } from "@/lib/money"

const ZERO = BigInt(0)

export type CreateSaleResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: "validation" | "forbidden" | "location" | "empty" | "product" | "price" | "server"; message: string }

export async function createSale(raw: unknown): Promise<CreateSaleResult> {
  const parsed = createSaleInputSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input." }
  }
  const input = parsed.data

  let ctx: Awaited<ReturnType<typeof requireCatalogMember>>
  try {
    ctx = await requireCatalogMember(input.businessSlug)
  } catch {
    return { ok: false, error: "forbidden", message: "You do not have access to this business." }
  }

  const organizationId = ctx.organization.id
  const userId = ctx.member.userId

  const location = await getLocationByOrganizationAndSlug(organizationId, input.locationSlug)
  if (!location) {
    return { ok: false, error: "location", message: "Branch not found." }
  }

  if (input.checkoutId) {
    const existing = await findTransactionIdByCheckoutId(organizationId, input.checkoutId)
    if (existing) {
      return { ok: true, transactionId: existing }
    }
  }

  const sellableIds = new Set(await listSellableProductIdsForLocation(organizationId, location.id))
  if (sellableIds.size === 0 && input.lines.length > 0) {
    return { ok: false, error: "empty", message: "No products are available at this branch." }
  }

  const db = getDb()

  const productIds = [...new Set(input.lines.map((l) => l.productId))]
  const priceIds = [...new Set(input.lines.map((l) => l.productPriceId))]

  const [products, prices] = await Promise.all([
    db
      .select()
      .from(product)
      .where(and(eq(product.organizationId, organizationId), inArray(product.id, productIds))),
    db.select().from(productPrice).where(inArray(productPrice.id, priceIds)),
  ])

  const productById = new Map(products.map((p) => [p.id, p]))
  const priceById = new Map(prices.map((p) => [p.id, p]))

  const resolvedLines: {
    productId: string
    productPriceId: string
    quantity: number
    unitPriceMinor: bigint
    subtotalMinor: bigint
  }[] = []

  for (const line of input.lines) {
    const p = productById.get(line.productId)
    if (!p || !p.isActive) {
      return { ok: false, error: "product", message: "One or more products are not available." }
    }
    if (!sellableIds.has(p.id)) {
      return { ok: false, error: "product", message: "One or more products are not sold at this branch." }
    }

    const pr = priceById.get(line.productPriceId)
    if (!pr || pr.productId !== p.id) {
      return { ok: false, error: "price", message: "Invalid price selection for a product." }
    }

    const unitPriceMinor = pr.amountMinor
    const subtotalMinor = unitPriceMinor * BigInt(line.quantity)
    resolvedLines.push({
      productId: p.id,
      productPriceId: pr.id,
      quantity: line.quantity,
      unitPriceMinor,
      subtotalMinor,
    })
  }

  const lineSubtotals = resolvedLines.map((l) => l.subtotalMinor)
  const subtotalAmountMinor = sumMinor(lineSubtotals)
  const totalAmountMinor = subtotalAmountMinor

  const transactionId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(posTransactions).values({
        id: transactionId,
        organizationId,
        locationId: location.id,
        userId,
        status: "completed",
        subtotalAmountMinor,
        discountAmountMinor: ZERO,
        taxAmountMinor: ZERO,
        totalAmountMinor,
        paymentMethod: input.paymentMethod,
        notes: input.notes?.trim() || null,
        checkoutId: input.checkoutId ?? null,
      })

      for (const line of resolvedLines) {
        await tx.insert(posTransactionItems).values({
          id: randomUUID(),
          transactionId,
          productId: line.productId,
          productPriceId: line.productPriceId,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          discountMinor: ZERO,
          subtotalMinor: line.subtotalMinor,
        })
      }
    })
  } catch (e) {
    if (input.checkoutId) {
      const existing = await findTransactionIdByCheckoutId(organizationId, input.checkoutId)
      if (existing) return { ok: true, transactionId: existing }
    }
    console.error(e)
    return { ok: false, error: "server", message: "Checkout failed. Please try again." }
  }

  return { ok: true, transactionId }
}
