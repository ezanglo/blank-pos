import { and, asc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { user } from "@/lib/db/auth-schema"
import { businessDetails, businessLocation } from "@/lib/db/schema-app"
import { product, productPrice } from "@/lib/db/schema-catalog"
import { posTransactionItems, posTransactions } from "@/lib/db/schema-transactions"

export type TransactionReceiptLine = {
  id: string
  productName: string
  priceLabel: string
  quantity: number
  unitPriceMinor: bigint
  subtotalMinor: bigint
}

export type TransactionReceiptBundle = {
  transaction: typeof posTransactions.$inferSelect
  lines: TransactionReceiptLine[]
  location: typeof businessLocation.$inferSelect
  businessDetails: typeof businessDetails.$inferSelect | null
  cashierName: string
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

  const lines: TransactionReceiptLine[] = linesWithLabels.map((r) => ({
    id: r.item.id,
    productName: r.productName,
    priceLabel: r.priceLabel,
    quantity: r.item.quantity,
    unitPriceMinor: r.item.unitPriceMinor,
    subtotalMinor: r.item.subtotalMinor,
  }))

  return {
    transaction: header,
    lines,
    location: loc,
    businessDetails: details ?? null,
    cashierName: cashier?.name?.trim() || "Staff",
  }
}
