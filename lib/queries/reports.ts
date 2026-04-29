import { and, asc, count, desc, eq, exists, gte, lte, sql, sum } from "drizzle-orm"

import type { TransactionOrderSearchFilter } from "@/lib/format-order-number"
import { getDb } from "@/lib/db"
import { product } from "@/lib/db/schema-catalog"
import {
  posTransactionItems,
  posTransactions,
  transactionStatusValues,
  type TransactionStatus,
} from "@/lib/db/schema-transactions"

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

/** When `undefined`, do not filter by status (all statuses in range). */
export function parseTransactionStatusFilter(raw: string | undefined): TransactionStatus | undefined {
  if (!raw || raw === "all") return undefined
  return transactionStatusValues.includes(raw as TransactionStatus) ? (raw as TransactionStatus) : undefined
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
  status?: TransactionStatus,
): Promise<DailySalesSummary> {
  const db = getDb()
  const parts = [
    eq(posTransactions.organizationId, organizationId),
    eq(posTransactions.locationId, locationId),
    gte(posTransactions.createdAt, from),
    lte(posTransactions.createdAt, to),
  ]
  if (status) parts.push(eq(posTransactions.status, status))

  const [row] = await db
    .select({
      transactionCount: count(),
      grossSubtotalMinor: sum(posTransactions.subtotalAmountMinor),
    })
    .from(posTransactions)
    .where(and(...parts)!)

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

/** One UTC calendar day bucket (YYYY-MM-DD) for charting. */
export type DailySalesSeriesRow = {
  day: string
  transactionCount: number
  grossSubtotalMinor: bigint
}

/**
 * Aggregates sales by UTC calendar day for a location (all transaction statuses unless `status` set).
 */
export async function getDailySalesSeries(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
  status?: TransactionStatus,
): Promise<DailySalesSeriesRow[]> {
  const db = getDb()
  const parts = [
    eq(posTransactions.organizationId, organizationId),
    eq(posTransactions.locationId, locationId),
    gte(posTransactions.createdAt, from),
    lte(posTransactions.createdAt, to),
  ]
  if (status) parts.push(eq(posTransactions.status, status))

  const utcDay = sql`(${posTransactions.createdAt} AT TIME ZONE 'UTC')::date`

  const rows = await db
    .select({
      day: sql<string>`to_char(${utcDay}, 'YYYY-MM-DD')`,
      transactionCount: sql<number>`count(*)::int`.mapWith(Number),
      grossSubtotalMinor: sum(posTransactions.subtotalAmountMinor),
    })
    .from(posTransactions)
    .where(and(...parts)!)
    .groupBy(utcDay)
    .orderBy(asc(utcDay))

  return rows.map((r) => {
    const raw = r.grossSubtotalMinor
    const grossSubtotalMinor = typeof raw === "bigint" ? raw : BigInt(String(raw ?? 0))
    return {
      day: r.day,
      transactionCount: r.transactionCount ?? 0,
      grossSubtotalMinor,
    }
  })
}

/** Fill missing UTC calendar days with zeros so charts have a point per day in [startIso, endIso] inclusive. */
export function fillDailySalesSeriesGaps(
  rows: DailySalesSeriesRow[],
  startIsoDay: string,
  endIsoDay: string,
): DailySalesSeriesRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r]))
  const out: DailySalesSeriesRow[] = []
  const start = parseReportDayStartUtc(startIsoDay)
  const end = parseReportDayStartUtc(endIsoDay)
  if (!start || !end) return rows

  for (let d = new Date(start.getTime()); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    const hit = byDay.get(key)
    out.push(
      hit ?? {
        day: key,
        transactionCount: 0,
        grossSubtotalMinor: BigInt(0),
      },
    )
  }
  return out
}

/** ISO date string (UTC) for "today" on the server. */
export function utcTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Start of UTC day `daysAgo` before `endIso` (0 = same day as endIso). */
export function utcCalendarDayStartIso(endIso: string, daysBeforeEnd: number): string | null {
  const end = parseReportDayStartUtc(endIso)
  if (!end) return null
  const d = new Date(end)
  d.setUTCDate(d.getUTCDate() - daysBeforeEnd)
  return d.toISOString().slice(0, 10)
}

/** Max inclusive UTC-day span for dashboard aggregates (ops guardrail). */
export const DASHBOARD_REPORT_MAX_SPAN_DAYS = 366

export type DashboardDatePreset = "daily" | "weekly" | "monthly" | "custom"

export function parseDashboardDatePreset(raw: string | undefined): DashboardDatePreset {
  if (raw === "weekly" || raw === "monthly" || raw === "custom") return raw
  return "daily"
}

function isValidIsoDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) && parseReportDayStartUtc(s) != null
}

/** Inclusive count of UTC calendar days from `fromIso` through `toIso`, or null if invalid or from > to. */
export function utcInclusiveDaySpan(fromIso: string, toIso: string): number | null {
  const a = parseReportDayStartUtc(fromIso)
  const b = parseReportDayStartUtc(toIso)
  if (!a || !b) return null
  if (b.getTime() < a.getTime()) return null
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1
}

/** Monday 00:00Z through Sunday (same week, UTC) containing `anchorIso`. */
export function utcMondayWeekRangeContaining(anchorIso: string): { fromIso: string; toIso: string } | null {
  const start = parseReportDayStartUtc(anchorIso)
  if (!start) return null
  const dow = start.getUTCDay()
  const daysSinceMonday = (dow + 6) % 7
  const monday = new Date(start)
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday)
  const fromIso = monday.toISOString().slice(0, 10)
  const sunday = new Date(monday)
  sunday.setUTCDate(sunday.getUTCDate() + 6)
  const toIso = sunday.toISOString().slice(0, 10)
  return { fromIso, toIso }
}

/** First through last UTC calendar day of the month containing `anchorIso`. */
export function utcMonthRangeContaining(anchorIso: string): { fromIso: string; toIso: string } | null {
  const start = parseReportDayStartUtc(anchorIso)
  if (!start) return null
  const y = start.getUTCFullYear()
  const m = start.getUTCMonth()
  const fromIso = `${y}-${String(m + 1).padStart(2, "0")}-01`
  const last = new Date(Date.UTC(y, m + 1, 0))
  const toIso = last.toISOString().slice(0, 10)
  return { fromIso, toIso }
}

export type ResolvedDashboardDateRange = {
  preset: DashboardDatePreset
  fromStr: string
  toStr: string
}

/**
 * Maps dashboard URL query to inclusive UTC report bounds. Returns null for malformed input
 * (invalid dates, custom without both ends, from > to, or span over DASHBOARD_REPORT_MAX_SPAN_DAYS).
 */
export function resolveDashboardUtcDateRangeFromQuery(sp: {
  preset?: string | string[]
  anchor?: string | string[]
  from?: string | string[]
  to?: string | string[]
}): ResolvedDashboardDateRange | null {
  const preset = parseDashboardDatePreset(
    typeof sp.preset === "string" ? sp.preset : Array.isArray(sp.preset) ? sp.preset[0] : undefined,
  )
  const pick = (v: string | string[] | undefined): string | undefined =>
    typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined

  const defaultAnchor = utcTodayIsoDate()

  let fromStr: string
  let toStr: string

  if (preset === "custom") {
    const fromRaw = pick(sp.from)?.trim() ?? ""
    const toRaw = pick(sp.to)?.trim() ?? ""
    if (!fromRaw || !toRaw || !isValidIsoDateString(fromRaw) || !isValidIsoDateString(toRaw)) return null
    if (fromRaw > toRaw) return null
    fromStr = fromRaw
    toStr = toRaw
  } else {
    const anchorRaw = pick(sp.anchor)?.trim() ?? ""
    const anchor = anchorRaw && isValidIsoDateString(anchorRaw) ? anchorRaw : defaultAnchor

    if (preset === "daily") {
      fromStr = anchor
      toStr = anchor
    } else if (preset === "weekly") {
      const w = utcMondayWeekRangeContaining(anchor)
      if (!w) return null
      fromStr = w.fromIso
      toStr = w.toIso
    } else {
      const mo = utcMonthRangeContaining(anchor)
      if (!mo) return null
      fromStr = mo.fromIso
      toStr = mo.toIso
    }
  }

  const span = utcInclusiveDaySpan(fromStr, toStr)
  if (span == null || span > DASHBOARD_REPORT_MAX_SPAN_DAYS) return null

  return { preset, fromStr, toStr }
}

export async function listRecentTransactionsForLocation(
  organizationId: string,
  locationId: string,
  take: number,
): Promise<TransactionListRow[]> {
  const db = getDb()
  const n = Math.min(50, Math.max(1, take))
  const rows = await db
    .select({
      id: posTransactions.id,
      createdAt: posTransactions.createdAt,
      status: posTransactions.status,
      totalMinor: posTransactions.totalAmountMinor,
      queueNumber: posTransactions.queueNumber,
      customerCallName: posTransactions.customerCallName,
    })
    .from(posTransactions)
    .where(and(eq(posTransactions.organizationId, organizationId), eq(posTransactions.locationId, locationId)))
    .orderBy(desc(posTransactions.createdAt))
    .limit(n)

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    status: r.status,
    totalMinor: typeof r.totalMinor === "bigint" ? r.totalMinor : BigInt(String(r.totalMinor)),
    queueNumber: r.queueNumber,
    customerCallName: r.customerCallName,
  }))
}

export async function listRecentTransactionsForLocationInRange(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
  take: number,
): Promise<TransactionListRow[]> {
  const db = getDb()
  const n = Math.min(50, Math.max(1, take))
  const rows = await db
    .select({
      id: posTransactions.id,
      createdAt: posTransactions.createdAt,
      status: posTransactions.status,
      totalMinor: posTransactions.totalAmountMinor,
      queueNumber: posTransactions.queueNumber,
      customerCallName: posTransactions.customerCallName,
    })
    .from(posTransactions)
    .where(
      and(
        eq(posTransactions.organizationId, organizationId),
        eq(posTransactions.locationId, locationId),
        gte(posTransactions.createdAt, from),
        lte(posTransactions.createdAt, to),
      )!,
    )
    .orderBy(desc(posTransactions.createdAt))
    .limit(n)

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    status: r.status,
    totalMinor: typeof r.totalMinor === "bigint" ? r.totalMinor : BigInt(String(r.totalMinor)),
    queueNumber: r.queueNumber,
    customerCallName: r.customerCallName,
  }))
}

export type ProductSalesRow = {
  productId: string
  productName: string
  unitsSold: number
  revenueMinor: bigint
  /** Distinct transactions that include this product (same filters as the row). */
  orderCount: number
}

export async function getProductSalesForRange(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
  status?: TransactionStatus,
): Promise<ProductSalesRow[]> {
  const db = getDb()
  const parts = [
    eq(posTransactions.organizationId, organizationId),
    eq(posTransactions.locationId, locationId),
    gte(posTransactions.createdAt, from),
    lte(posTransactions.createdAt, to),
  ]
  if (status) parts.push(eq(posTransactions.status, status))

  const rows = await db
    .select({
      productId: posTransactionItems.productId,
      productName: product.name,
      unitsSold: sql<number>`sum(${posTransactionItems.quantity})::int`.mapWith(Number),
      revenueMinor: sum(posTransactionItems.subtotalMinor),
      orderCount: sql<number>`count(distinct ${posTransactionItems.transactionId})::int`.mapWith(Number),
    })
    .from(posTransactionItems)
    .innerJoin(posTransactions, eq(posTransactionItems.transactionId, posTransactions.id))
    .innerJoin(product, eq(product.id, posTransactionItems.productId))
    .where(and(...parts)!)
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
      orderCount: r.orderCount ?? 0,
    }
  })
}

export async function listProductSalesForRangePage(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
  page: number,
  pageSize: number,
  status?: TransactionStatus,
): Promise<{ rows: ProductSalesRow[]; total: number }> {
  const db = getDb()
  const p = Math.max(1, page)
  const ps = Math.max(1, Math.min(100, pageSize))
  const offset = (p - 1) * ps

  const parts = [
    eq(posTransactions.organizationId, organizationId),
    eq(posTransactions.locationId, locationId),
    gte(posTransactions.createdAt, from),
    lte(posTransactions.createdAt, to),
  ]
  if (status) parts.push(eq(posTransactions.status, status))
  const whereClause = and(...parts)!

  const groupsSq = db
    .select({ gid: posTransactionItems.productId })
    .from(posTransactionItems)
    .innerJoin(posTransactions, eq(posTransactionItems.transactionId, posTransactions.id))
    .innerJoin(product, eq(product.id, posTransactionItems.productId))
    .where(whereClause)
    .groupBy(posTransactionItems.productId, product.name)
    .as("product_sales_groups")

  const [{ n: total }] = await db
    .select({ n: sql<number>`count(*)::int`.mapWith(Number) })
    .from(groupsSq)

  const rows = await db
    .select({
      productId: posTransactionItems.productId,
      productName: product.name,
      unitsSold: sql<number>`sum(${posTransactionItems.quantity})::int`.mapWith(Number),
      revenueMinor: sum(posTransactionItems.subtotalMinor),
      orderCount: sql<number>`count(distinct ${posTransactionItems.transactionId})::int`.mapWith(Number),
    })
    .from(posTransactionItems)
    .innerJoin(posTransactions, eq(posTransactionItems.transactionId, posTransactions.id))
    .innerJoin(product, eq(product.id, posTransactionItems.productId))
    .where(whereClause)
    .groupBy(posTransactionItems.productId, product.name)
    .orderBy(sql`${sum(posTransactionItems.subtotalMinor)} desc`)
    .limit(ps)
    .offset(offset)

  return {
    rows: rows.map((r) => {
      const rev = r.revenueMinor
      const revenueMinor = typeof rev === "bigint" ? rev : BigInt(String(rev ?? 0))
      return {
        productId: r.productId,
        productName: r.productName,
        unitsSold: r.unitsSold,
        revenueMinor,
        orderCount: r.orderCount ?? 0,
      }
    }),
    total: total ?? 0,
  }
}

export type TransactionListRow = {
  id: string
  createdAt: Date
  status: string
  totalMinor: bigint
  queueNumber: number | null
  customerCallName: string | null
}

/** Escape `%`, `_`, and `\` for use in `ILIKE ... ESCAPE '\'` patterns. */
function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

export async function listTransactionsForLocationPage(
  organizationId: string,
  locationId: string,
  from: Date,
  to: Date,
  page: number,
  pageSize: number,
  status?: TransactionStatus,
  orderSearch?: TransactionOrderSearchFilter | null,
  nameSearch?: string | null,
): Promise<{ rows: TransactionListRow[]; total: number }> {
  const db = getDb()
  const p = Math.max(1, page)
  const ps = Math.max(1, Math.min(100, pageSize))
  const offset = (p - 1) * ps

  const parts = [
    eq(posTransactions.organizationId, organizationId),
    eq(posTransactions.locationId, locationId),
    gte(posTransactions.createdAt, from),
    lte(posTransactions.createdAt, to),
  ]
  if (status) parts.push(eq(posTransactions.status, status))
  if (orderSearch) {
    if (orderSearch.mode === "queue") {
      parts.push(eq(posTransactions.queueNumber, orderSearch.queueNumber))
    } else {
      parts.push(gte(posTransactions.createdAt, orderSearch.dayStart))
      parts.push(lte(posTransactions.createdAt, orderSearch.dayEnd))
      parts.push(eq(posTransactions.queueNumber, orderSearch.queueNumber))
    }
  } else if (nameSearch?.trim()) {
    const pat = `%${escapeIlikePattern(nameSearch.trim())}%`
    parts.push(sql`${posTransactions.customerCallName} ilike ${pat} escape '\\'`)
  }
  const whereClause = and(...parts)!

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
      customerCallName: posTransactions.customerCallName,
    })
    .from(posTransactions)
    .where(whereClause)
    .orderBy(desc(posTransactions.createdAt))
    .limit(ps)
    .offset(offset)

  return { rows, total: total ?? 0 }
}

/** Transactions in range that include at least one line for `productId` (same status filter as product sales). */
export async function listTransactionsForProductInRangePage(
  organizationId: string,
  locationId: string,
  productId: string,
  from: Date,
  to: Date,
  page: number,
  pageSize: number,
  status?: TransactionStatus,
): Promise<{ rows: TransactionListRow[]; total: number }> {
  const db = getDb()
  const p = Math.max(1, page)
  const ps = Math.max(1, Math.min(100, pageSize))
  const offset = (p - 1) * ps

  const hasProductLine = exists(
    db
      .select()
      .from(posTransactionItems)
      .where(
        and(
          eq(posTransactionItems.transactionId, posTransactions.id),
          eq(posTransactionItems.productId, productId),
        ),
      ),
  )

  const parts = [
    eq(posTransactions.organizationId, organizationId),
    eq(posTransactions.locationId, locationId),
    gte(posTransactions.createdAt, from),
    lte(posTransactions.createdAt, to),
    hasProductLine,
  ]
  if (status) parts.push(eq(posTransactions.status, status))
  const whereClause = and(...parts)!

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
      customerCallName: posTransactions.customerCallName,
    })
    .from(posTransactions)
    .where(whereClause)
    .orderBy(desc(posTransactions.createdAt))
    .limit(ps)
    .offset(offset)

  return { rows, total: total ?? 0 }
}

export type TransactionLineDetailRow = {
  id: string
  productName: string
  quantity: number
  unitPriceMinor: bigint
  subtotalMinor: bigint
}

export async function getTransactionReportDetail(
  organizationId: string,
  locationId: string,
  transactionId: string,
): Promise<{ transaction: typeof posTransactions.$inferSelect; lines: TransactionLineDetailRow[] } | null> {
  const db = getDb()
  const [tx] = await db
    .select()
    .from(posTransactions)
    .where(
      and(
        eq(posTransactions.id, transactionId),
        eq(posTransactions.organizationId, organizationId),
        eq(posTransactions.locationId, locationId),
      ),
    )
    .limit(1)
  if (!tx) return null

  const lineRows = await db
    .select({
      id: posTransactionItems.id,
      productName: product.name,
      quantity: posTransactionItems.quantity,
      unitPriceMinor: posTransactionItems.unitPriceMinor,
      subtotalMinor: posTransactionItems.subtotalMinor,
    })
    .from(posTransactionItems)
    .innerJoin(product, eq(product.id, posTransactionItems.productId))
    .where(eq(posTransactionItems.transactionId, transactionId))
    .orderBy(asc(posTransactionItems.id))

  const lines: TransactionLineDetailRow[] = lineRows.map((r) => ({
    id: r.id,
    productName: r.productName,
    quantity: r.quantity,
    unitPriceMinor: typeof r.unitPriceMinor === "bigint" ? r.unitPriceMinor : BigInt(String(r.unitPriceMinor)),
    subtotalMinor: typeof r.subtotalMinor === "bigint" ? r.subtotalMinor : BigInt(String(r.subtotalMinor)),
  }))

  return { transaction: tx, lines }
}

/** RFC-4180 style CSV cell (quote if needed). */
export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function productSalesRowsToCsv(rows: ProductSalesRow[]): string {
  const header = ["product_id", "product_name", "units_sold", "revenue_minor", "order_count"].join(",")
  const body = rows
    .map((r) =>
      [
        escapeCsvCell(r.productId),
        escapeCsvCell(r.productName),
        String(r.unitsSold),
        String(r.revenueMinor),
        String(r.orderCount),
      ].join(","),
    )
    .join("\n")
  return `${header}\n${body}\n`
}
