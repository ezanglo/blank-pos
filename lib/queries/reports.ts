import { and, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { product } from "@/lib/db/schema-catalog"
import { posTransactionItems, posTransactions } from "@/lib/db/schema-transactions"

export function parseReportDayStartUtc(isoDate: string): Date | null {
  const t = isoDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return new Date(`${t}T00:00:00.000Z`)
}

export function parseReportDayEndUtc(isoDate: string): Date | null {
  const t = isoDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return new Date(`${t}T23:59:59.999Z`)
}

export type DailySalesSummary = {
  transactionCount: number
  grossSubtotalMinor: bigint
  averageBasketMinor: bigint | null
}

export async function getDailySalesSummary(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
): Promise<DailySalesSummary> {
  const db = getDb()
  const [row] = await db
    .select({
      transactionCount: count(),
      grossSubtotalMinor: sum(posTransactions.subtotalAmountMinor),
    })
    .from(posTransactions)
    .where(
      and(
        eq(posTransactions.organizationId, organizationId),
        eq(posTransactions.locationId, locationId),
        gte(posTransactions.createdAt, from),
        lte(posTransactions.createdAt, to),
      ),
    )

  const n = Number(row?.transactionCount ?? 0)
  const grossRaw = row?.grossSubtotalMinor
  const gross = typeof grossRaw === "bigint" ? grossRaw : BigInt(String(grossRaw ?? 0))
  const avg = n > 0 ? gross / BigInt(n) : null

  return {
    transactionCount: n,
    grossSubtotalMinor: gross,
    averageBasketMinor: avg,
  }
}

export type ProductSalesRow = {
  productId: string
  productName: string
  unitsSold: number
  revenueMinor: bigint
}

export async function getProductSalesForRange(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
): Promise<ProductSalesRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      productId: posTransactionItems.productId,
      productName: product.name,
      unitsSold: sql<number>`sum(${posTransactionItems.quantity})::int`.mapWith(Number),
      revenueMinor: sum(posTransactionItems.subtotalMinor),
    })
    .from(posTransactionItems)
    .innerJoin(posTransactions, eq(posTransactionItems.transactionId, posTransactions.id))
    .innerJoin(product, eq(product.id, posTransactionItems.productId))
    .where(
      and(
        eq(posTransactions.organizationId, organizationId),
        eq(posTransactions.locationId, locationId),
        gte(posTransactions.createdAt, from),
        lte(posTransactions.createdAt, to),
      ),
    )
    .groupBy(posTransactionItems.productId, product.name)
    .orderBy(sql`${sum(posTransactionItems.subtotalMinor)} desc`)

  return rows.map((r) => {
    const rev = r.revenueMinor
    const revenueMinor = typeof rev === "bigint" ? rev : BigInt(String(rev ?? 0))
    return {
      productId: r.productId,
      productName: r.productName,
      unitsSold: r.unitsSold,
      revenueMinor,
    }
  })
}

export type TransactionListRow = {
  id: string
  createdAt: Date
  status: string
  totalMinor: bigint
  queueNumber: number | null
}

export async function listTransactionsForLocationPage(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
  page: number,
  pageSize: number,
): Promise<{ rows: TransactionListRow[]; total: number }> {
  const db = getDb()
  const p = Math.max(1, page)
  const ps = Math.max(1, Math.min(100, pageSize))
  const offset = (p - 1) * ps

  const whereClause = and(
    eq(posTransactions.organizationId, organizationId),
    eq(posTransactions.locationId, locationId),
    gte(posTransactions.createdAt, from),
    lte(posTransactions.createdAt, to),
  )!

  const [{ n: total }] = await db
    .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
    .from(posTransactions)
    .where(whereClause)

  const rows = await db
    .select({
      id: posTransactions.id,
      createdAt: posTransactions.createdAt,
      status: posTransactions.status,
      totalMinor: posTransactions.totalAmountMinor,
      queueNumber: posTransactions.queueNumber,
    })
    .from(posTransactions)
    .where(whereClause)
    .orderBy(desc(posTransactions.createdAt))
    .limit(ps)
    .offset(offset)

  return { rows, total: total ?? 0 }
}
