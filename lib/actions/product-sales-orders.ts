"use server"

import { formatTransactionStatus } from "@/lib/db/schema-transactions"
import { formatOrderNumberLabel } from "@/lib/format-order-number"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import {
  listTransactionsForProductInRangePage,
  parseReportDayEndUtc,
  parseReportDayStartUtc,
  parseTransactionStatusFilter,
} from "@/lib/queries/reports"
import { requireSession } from "@/lib/server-auth"

export type ProductSalesOrderListItem = {
  id: string
  createdAtIso: string
  status: string
  statusLabel: string
  totalDisplay: string
  queueLabel: string
  customerCallName: string | null
}

const DIALOG_PAGE_SIZE = 12

export type LoadProductSalesOrdersPageResult =
  | {
      ok: true
      rows: ProductSalesOrderListItem[]
      total: number
      page: number
      pageSize: number
      totalPages: number
    }
  | { ok: false; error: "forbidden" | "bad_range" }

export async function loadProductSalesOrdersPage(
  businessSlug: string,
  locationSlug: string,
  productId: string,
  fromStr: string,
  toStr: string,
  statusParam: string,
  page: number,
): Promise<LoadProductSalesOrdersPageResult> {
  const session = await requireSession()
  const row = await getLocationForUserByBusinessAndLocationSlug(
    businessSlug,
    locationSlug,
    session.user.id,
  )
  if (!row || (row.member.role !== "owner" && row.member.role !== "manager")) {
    return { ok: false, error: "forbidden" }
  }

  const from = parseReportDayStartUtc(fromStr)
  const to = parseReportDayEndUtc(toStr)
  if (!from || !to) return { ok: false, error: "bad_range" }

  const status = parseTransactionStatusFilter(statusParam === "all" ? undefined : statusParam)
  const p = Math.max(1, page)

  const { rows, total } = await listTransactionsForProductInRangePage(
    row.organization.id,
    row.location.id,
    productId,
    from,
    to,
    p,
    DIALOG_PAGE_SIZE,
    status,
  )

  const totalPages = Math.max(1, Math.ceil(total / DIALOG_PAGE_SIZE))

  return {
    ok: true,
    rows: rows.map((r) => ({
      id: r.id,
      createdAtIso: r.createdAt.toISOString(),
      status: r.status,
      statusLabel: formatTransactionStatus(r.status),
      totalDisplay: formatMinorToDecimal2(r.totalMinor),
      queueLabel: formatOrderNumberLabel(r.createdAt, r.queueNumber),
      customerCallName: r.customerCallName,
    })),
    total,
    page: p,
    pageSize: DIALOG_PAGE_SIZE,
    totalPages,
  }
}
