"use server"

import { randomUUID } from "node:crypto"

import { and, eq, inArray, sql } from "drizzle-orm"

import { requireCatalogMember } from "@/lib/catalog-access"
import { getDb } from "@/lib/db"
import {
  product,
  productAddon,
  productCategory,
  productCategoryAddon,
  productCategoryInstruction,
  productPrice,
} from "@/lib/db/schema-catalog"
import {
  locationQueueCounter,
  posTransactionItemAddons,
  posTransactionItemInstructions,
  posTransactionItems,
  posTransactions,
} from "@/lib/db/schema-transactions"
import {
  applyInventoryDeductionForTransaction,
  InsufficientInventoryError,
} from "@/lib/inventory/sale-deduction"
import { listSellableProductIdsForLocation } from "@/lib/queries/catalog"
import { getLocationByOrganizationAndSlug } from "@/lib/queries/location"
import { findTransactionIdByCheckoutId } from "@/lib/queries/transactions"
import { createSaleInputSchema } from "@/lib/schemas/sales"
import { sumMinor } from "@/lib/money"

const ZERO = BigInt(0)

export type CreateSaleResult =
  | {
      ok: true
      transactionId: string
      queueNumber: number | null
      customerCallName: string | null
      /** Sum of per-product prep seconds × line qty when any line has `prep_time_seconds`; else null. */
      estimatedPrepSeconds: number | null
      /** Transaction `created_at` (for order label OR-YYYYMMDD-counter). */
      createdAtIso: string
    }
  | {
      ok: false
      error: "validation" | "forbidden" | "location" | "empty" | "product" | "price" | "inventory" | "server"
      message: string
    }

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
      const [meta] = await getDb()
        .select({
          queueNumber: posTransactions.queueNumber,
          customerCallName: posTransactions.customerCallName,
          createdAt: posTransactions.createdAt,
        })
        .from(posTransactions)
        .where(and(eq(posTransactions.id, existing), eq(posTransactions.organizationId, organizationId)))
        .limit(1)
      return {
        ok: true,
        transactionId: existing,
        queueNumber: meta?.queueNumber ?? null,
        customerCallName: meta?.customerCallName ?? null,
        estimatedPrepSeconds: null,
        createdAtIso: meta?.createdAt.toISOString() ?? new Date().toISOString(),
      }
    }
  }

  const sellableIds = new Set(await listSellableProductIdsForLocation(organizationId, location.id))
  if (sellableIds.size === 0 && input.lines.length > 0) {
    return { ok: false, error: "empty", message: "No products are available at this branch." }
  }

  const db = getDb()

  const productIds = [...new Set(input.lines.map((l) => l.productId))]
  const priceIds = [...new Set(input.lines.map((l) => l.productPriceId))]
  const allAddonIds = [...new Set(input.lines.flatMap((l) => (l.addons ?? []).map((a) => a.addonId)))]
  const allInstructionIds = [
    ...new Set(input.lines.flatMap((l) => (l.instructions ?? []).map((i) => i.instructionId))),
  ]

  const [products, prices] = await Promise.all([
    db
      .select()
      .from(product)
      .where(and(eq(product.organizationId, organizationId), inArray(product.id, productIds))),
    db.select().from(productPrice).where(inArray(productPrice.id, priceIds)),
  ])

  const addonRows =
    allAddonIds.length > 0
      ? await db
          .select()
          .from(productAddon)
          .where(
            and(eq(productAddon.organizationId, organizationId), inArray(productAddon.id, allAddonIds)),
          )
      : []
  const addonById = new Map(addonRows.map((a) => [a.id, a]))

  const categoryAddonLinks =
    allAddonIds.length > 0
      ? await db
          .select({
            addonId: productCategoryAddon.addonId,
            categoryId: productCategoryAddon.categoryId,
          })
          .from(productCategoryAddon)
          .where(inArray(productCategoryAddon.addonId, allAddonIds))
      : []
  const categoryAddonKey = new Set(categoryAddonLinks.map((l) => `${l.addonId}:${l.categoryId}`))

  const instructionRows =
    allInstructionIds.length > 0
      ? await db
          .select({ instruction: productCategoryInstruction })
          .from(productCategoryInstruction)
          .innerJoin(productCategory, eq(productCategoryInstruction.categoryId, productCategory.id))
          .where(
            and(
              eq(productCategory.organizationId, organizationId),
              inArray(productCategoryInstruction.id, allInstructionIds),
            ),
          )
      : []
  const instructionById = new Map(instructionRows.map((r) => [r.instruction.id, r.instruction]))

  const productById = new Map(products.map((p) => [p.id, p]))
  const priceById = new Map(prices.map((p) => [p.id, p]))

  type ResolvedAddon = {
    addonId: string
    name: string
    unitPriceMinor: bigint
    addonQuantity: number
    subtotalMinor: bigint
  }

  type ResolvedInstruction = {
    instructionId: string
    label: string
    sortOrder: number
  }

  const resolvedLines: {
    productId: string
    productPriceId: string
    quantity: number
    unitPriceMinor: bigint
    subtotalMinor: bigint
    addons: ResolvedAddon[]
    instructions: ResolvedInstruction[]
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

    const addonsInput = line.addons ?? []
    const addonIdsSeen = new Set<string>()
    for (const a of addonsInput) {
      if (addonIdsSeen.has(a.addonId)) {
        return { ok: false, error: "validation", message: "Duplicate add-on on a line." }
      }
      addonIdsSeen.add(a.addonId)
    }

    const unitPriceMinor = pr.amountMinor
    let productSubtotalMinor = unitPriceMinor * BigInt(line.quantity)
    const resolvedAddons: ResolvedAddon[] = []

    const instructionsInput = line.instructions ?? []

    for (const a of addonsInput) {
      const ad = addonById.get(a.addonId)
      if (!ad || !ad.isActive) {
        return { ok: false, error: "product", message: "One or more add-ons are not available." }
      }
      if (ad.currency !== pr.currency) {
        return { ok: false, error: "price", message: "Add-on currency must match the product price." }
      }

      if (!categoryAddonKey.has(`${ad.id}:${p.categoryId}`)) {
        return { ok: false, error: "product", message: "An add-on is not allowed for this product category." }
      }

      const addonQty = a.quantity ?? 1
      /** Per-drink add-on units × line qty (e.g. 2 drinks × 1 pearl each). */
      const addonSubtotal = ad.amountMinor * BigInt(addonQty) * BigInt(line.quantity)
      resolvedAddons.push({
        addonId: ad.id,
        name: ad.name,
        unitPriceMinor: ad.amountMinor,
        addonQuantity: addonQty,
        subtotalMinor: addonSubtotal,
      })
      productSubtotalMinor += addonSubtotal
    }

    const resolvedInstructions: ResolvedInstruction[] = []
    let sortIdx = 0
    for (const ins of instructionsInput) {
      const row = instructionById.get(ins.instructionId)
      if (!row) {
        return { ok: false, error: "product", message: "One or more special instructions are not available." }
      }
      if (row.categoryId !== p.categoryId) {
        return {
          ok: false,
          error: "product",
          message: "A special instruction is not allowed for this product category.",
        }
      }
      resolvedInstructions.push({
        instructionId: row.id,
        label: row.label,
        sortOrder: sortIdx++,
      })
    }

    resolvedLines.push({
      productId: p.id,
      productPriceId: pr.id,
      quantity: line.quantity,
      unitPriceMinor,
      subtotalMinor: productSubtotalMinor,
      addons: resolvedAddons,
      instructions: resolvedInstructions,
    })
  }

  const lineSubtotals = resolvedLines.map((l) => l.subtotalMinor)
  const subtotalAmountMinor = sumMinor(lineSubtotals)
  const totalAmountMinor = subtotalAmountMinor

  let estimatedPrepSecondsTotal = 0
  let anyPrep = false
  for (const line of resolvedLines) {
    const p = productById.get(line.productId)
    const sec = p?.prepTimeSeconds
    if (sec != null && sec > 0) {
      anyPrep = true
      estimatedPrepSecondsTotal += sec * line.quantity
    }
  }
  const estimatedPrepSeconds = anyPrep ? estimatedPrepSecondsTotal : null

  const callName = input.customerCallName?.trim() || null
  const queueDate = new Date().toISOString().slice(0, 10)

  const transactionId = randomUUID()
  let queueNumber: number | null = null
  let saleCreatedAtIso: string | null = null

  try {
    await db.transaction(async (tx) => {
      const [counterRow] = await tx
        .insert(locationQueueCounter)
        .values({
          locationId: location.id,
          queueDate,
          lastNumber: 1,
        })
        .onConflictDoUpdate({
          target: [locationQueueCounter.locationId, locationQueueCounter.queueDate],
          set: { lastNumber: sql`${locationQueueCounter.lastNumber} + 1` },
        })
        .returning({ lastNumber: locationQueueCounter.lastNumber })

      queueNumber = counterRow?.lastNumber ?? null
      if (queueNumber == null) {
        throw new Error("queue_counter_failed")
      }

      const [insertedTx] = await tx
        .insert(posTransactions)
        .values({
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
          queueNumber,
          customerCallName: callName,
          checkoutId: input.checkoutId ?? null,
        })
        .returning({ createdAt: posTransactions.createdAt })

      saleCreatedAtIso = insertedTx?.createdAt.toISOString() ?? null

      const saleLines: { transactionItemId: string; productId: string; quantity: number }[] = []
      for (const line of resolvedLines) {
        const itemId = randomUUID()
        saleLines.push({
          transactionItemId: itemId,
          productId: line.productId,
          quantity: line.quantity,
        })
        await tx.insert(posTransactionItems).values({
          id: itemId,
          transactionId,
          productId: line.productId,
          productPriceId: line.productPriceId,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          discountMinor: ZERO,
          subtotalMinor: line.subtotalMinor,
        })
        for (const ad of line.addons) {
          await tx.insert(posTransactionItemAddons).values({
            id: randomUUID(),
            transactionItemId: itemId,
            addonId: ad.addonId,
            name: ad.name,
            unitPriceMinor: ad.unitPriceMinor,
            quantity: ad.addonQuantity,
            subtotalMinor: ad.subtotalMinor,
          })
        }
        for (const ins of line.instructions) {
          await tx.insert(posTransactionItemInstructions).values({
            id: randomUUID(),
            transactionItemId: itemId,
            instructionId: ins.instructionId,
            label: ins.label,
            sortOrder: ins.sortOrder,
          })
        }
      }

      await applyInventoryDeductionForTransaction(tx, {
        organizationId,
        transactionId,
        userId,
        lines: saleLines,
      })
    })
  } catch (e) {
    if (e instanceof InsufficientInventoryError) {
      return { ok: false, error: "inventory", message: e.message }
    }
    if (input.checkoutId) {
      const existing = await findTransactionIdByCheckoutId(organizationId, input.checkoutId)
      if (existing) {
        const [meta] = await getDb()
          .select({
            queueNumber: posTransactions.queueNumber,
            customerCallName: posTransactions.customerCallName,
            createdAt: posTransactions.createdAt,
          })
          .from(posTransactions)
          .where(and(eq(posTransactions.id, existing), eq(posTransactions.organizationId, organizationId)))
          .limit(1)
        return {
          ok: true,
          transactionId: existing,
          queueNumber: meta?.queueNumber ?? null,
          customerCallName: meta?.customerCallName ?? null,
          estimatedPrepSeconds: null,
          createdAtIso: meta?.createdAt.toISOString() ?? new Date().toISOString(),
        }
      }
    }
    console.error(e)
    return { ok: false, error: "server", message: "Checkout failed. Please try again." }
  }

  if (queueNumber == null) {
    return { ok: false, error: "server", message: "Checkout failed. Please try again." }
  }

  return {
    ok: true,
    transactionId,
    queueNumber,
    customerCallName: callName,
    estimatedPrepSeconds,
    createdAtIso: saleCreatedAtIso ?? new Date().toISOString(),
  }
}
