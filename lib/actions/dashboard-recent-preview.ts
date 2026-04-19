"use server"

import { formatTransactionStatus } from "@/lib/db/schema-transactions"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import { getTransactionReportDetail } from "@/lib/queries/reports"
import { requireSession } from "@/lib/server-auth"

export type DashboardTransactionLinesPreview = {
  createdAtIso: string
  queueNumber: number | null
  statusLabel: string
  lines: {
    id: string
    productName: string
    quantity: number
    unit: string
    subtotal: string
  }[]
}

export async function loadDashboardTransactionLines(
  businessSlug: string,
  locationSlug: string,
  transactionId: string,
): Promise<DashboardTransactionLinesPreview | null> {
  const session = await requireSession()
  const row = await getLocationForUserByBusinessAndLocationSlug(
    businessSlug,
    locationSlug,
    session.user.id,
  )
  if (!row || (row.member.role !== "owner" && row.member.role !== "manager")) {
    return null
  }

  const detail = await getTransactionReportDetail(row.organization.id, row.location.id, transactionId)
  if (!detail) return null

  const { transaction, lines } = detail
  return {
    createdAtIso: transaction.createdAt.toISOString(),
    queueNumber: transaction.queueNumber,
    statusLabel: formatTransactionStatus(transaction.status),
    lines: lines.map((l) => ({
      id: l.id,
      productName: l.productName,
      quantity: l.quantity,
      unit: formatMinorToDecimal2(l.unitPriceMinor),
      subtotal: formatMinorToDecimal2(l.subtotalMinor),
    })),
  }
}
