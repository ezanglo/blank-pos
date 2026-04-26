import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { user } from "@/lib/db/auth-schema"
import { businessDetails, businessLocation } from "@/lib/db/schema-app"
import { getPaymentMethodLabelMap } from "@/lib/queries/payment-methods"
import { product, productPrice } from "@/lib/db/schema-catalog"
import {
  posTransactionItemAddons,
  posTransactionItemInstructions,
  posTransactionItems,
  posTransactions,
} from "@/lib/db/schema-transactions"

export type TransactionReceiptAddonLine = {
  id: string
  name: string
  quantity: number
  unitPriceMinor: bigint
  subtotalMinor: bigint
}

export type TransactionReceiptInstructionLine = {
  id: string
  label: string
}

export type TransactionReceiptLine = {
  id: string
  productName: string
  priceLabel: string
  quantity: number
  unitPriceMinor: bigint
  subtotalMinor: bigint
  addons: TransactionReceiptAddonLine[]
  instructions: TransactionReceiptInstructionLine[]
}

export type TransactionReceiptBundle = {
  transaction: typeof posTransactions.$inferSelect
  lines: TransactionReceiptLine[]
  location: typeof businessLocation.$inferSelect
  businessDetails: typeof businessDetails.$inferSelect | null
  cashierName: string
  /** Maps `transaction.payment_method` keys to display labels for receipts. */
  paymentMethodLabels: Record<string, string>
}

export async function findTransactionIdByCheckoutId(
  organizationId: string,
  checkoutId: string,
): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .select({ id: posTransactions.id })
    .from(posTransactions)
    .where(and(eq(posTransactions.organizationId, organizationId), eq(posTransactions.checkoutId, checkoutId)))
    .limit(1)
  return row?.id ?? null
}

/** Most recent completed sale at this branch (for POS “last receipt” shortcut). */
export async function getLatestTransactionIdForLocation(
  organizationId: string,
  locationId: string,
): Promise<string | null> {
  const db = getDb()
  const [row] = await db
    .select({ id: posTransactions.id })
    .from(posTransactions)
    .where(
      and(eq(posTransactions.organizationId, organizationId), eq(posTransactions.locationId, locationId)),
    )
    .orderBy(desc(posTransactions.createdAt))
    .limit(1)
  return row?.id ?? null
}

export async function getTransactionReceiptBundle(
  organizationId: string,
  transactionId: string,
): Promise<TransactionReceiptBundle | null> {
  const db = getDb()
  const [header] = await db
    .select()
    .from(posTransactions)
    .where(and(eq(posTransactions.id, transactionId), eq(posTransactions.organizationId, organizationId)))
    .limit(1)
  if (!header) return null

  const [loc] = await db
    .select()
    .from(businessLocation)
    .where(eq(businessLocation.id, header.locationId))
    .limit(1)
  if (!loc) return null

  const [details] = await db
    .select()
    .from(businessDetails)
    .where(eq(businessDetails.organizationId, organizationId))
    .limit(1)

  const [cashier] = await db.select({ name: user.name }).from(user).where(eq(user.id, header.userId)).limit(1)

  const linesWithLabels = await db
    .select({
      item: posTransactionItems,
      productName: product.name,
      priceLabel: productPrice.label,
    })
    .from(posTransactionItems)
    .innerJoin(product, eq(posTransactionItems.productId, product.id))
    .innerJoin(productPrice, eq(posTransactionItems.productPriceId, productPrice.id))
    .where(eq(posTransactionItems.transactionId, transactionId))
    .orderBy(asc(posTransactionItems.id))

  const itemIds = linesWithLabels.map((r) => r.item.id)
  const addonRows =
    itemIds.length > 0
      ? await db
          .select()
          .from(posTransactionItemAddons)
          .where(inArray(posTransactionItemAddons.transactionItemId, itemIds))
          .orderBy(asc(posTransactionItemAddons.id))
      : []

  const addonsByItem = new Map<string, TransactionReceiptAddonLine[]>()
  for (const a of addonRows) {
    const list = addonsByItem.get(a.transactionItemId) ?? []
    list.push({
      id: a.id,
      name: a.name,
      quantity: a.quantity,
      unitPriceMinor: a.unitPriceMinor,
      subtotalMinor: a.subtotalMinor,
    })
    addonsByItem.set(a.transactionItemId, list)
  }

  const instructionRows =
    itemIds.length > 0
      ? await db
          .select()
          .from(posTransactionItemInstructions)
          .where(inArray(posTransactionItemInstructions.transactionItemId, itemIds))
          .orderBy(asc(posTransactionItemInstructions.sortOrder), asc(posTransactionItemInstructions.id))
      : []

  const instructionsByItem = new Map<string, TransactionReceiptInstructionLine[]>()
  for (const row of instructionRows) {
    const list = instructionsByItem.get(row.transactionItemId) ?? []
    list.push({ id: row.id, label: row.label })
    instructionsByItem.set(row.transactionItemId, list)
  }

  const lines: TransactionReceiptLine[] = linesWithLabels.map((r) => ({
    id: r.item.id,
    productName: r.productName,
    priceLabel: r.priceLabel,
    quantity: r.item.quantity,
    unitPriceMinor: r.item.unitPriceMinor,
    subtotalMinor: r.item.subtotalMinor,
    addons: addonsByItem.get(r.item.id) ?? [],
    instructions: instructionsByItem.get(r.item.id) ?? [],
  }))

  const paymentMethodLabels = await getPaymentMethodLabelMap(organizationId)

  return {
    transaction: header,
    lines,
    location: loc,
    businessDetails: details ?? null,
    cashierName: cashier?.name?.trim() || "Staff",
    paymentMethodLabels,
  }
}
