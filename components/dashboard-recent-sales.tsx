"use client"

import Link from "next/link"

import { VoidTransactionButton } from "@/components/reports/void-transaction-button"
import { LinesSheetButton } from "@/components/transactions/lines-sheet-button"
import { ReceiptSheetButton } from "@/components/transactions/receipt-sheet-button"
import { buttonVariants } from "@/components/ui/button"
import { formatTransactionStatus } from "@/lib/db/schema-transactions"
import { formatOrderNumberLabel } from "@/lib/format-order-number"
import { cn } from "@/lib/utils"

export type DashboardRecentSaleRow = {
  id: string
  createdAtIso: string
  queueNumber: number | null
  customerCallName: string | null
  status: string
  totalFormatted: string
}

export function DashboardRecentSales({
  businessSlug,
  locationSlug,
  rows,
}: {
  businessSlug: string
  locationSlug: string
  rows: DashboardRecentSaleRow[]
}) {
  const base = `/${businessSlug}/l/${locationSlug}`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">Recent sales</h2>
        <Link href={`${base}/transactions`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          View all transactions
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left font-medium">When</th>
              <th className="p-3 text-left font-medium">#</th>
              <th className="p-3 text-left font-medium">Name for order</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-right font-medium">Total</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground p-6 text-center">
                  No transactions in this range.
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const createdAt = new Date(t.createdAtIso)
                return (
                  <tr key={t.id} className="border-t">
                    <td className="p-3 whitespace-nowrap tabular-nums">{createdAt.toLocaleString()}</td>
                    <td className="p-3 tabular-nums">{formatOrderNumberLabel(createdAt, t.queueNumber)}</td>
                    <td
                      className="text-muted-foreground max-w-48 truncate p-3"
                      title={t.customerCallName ?? undefined}
                    >
                      {t.customerCallName?.trim() ? t.customerCallName.trim() : "—"}
                    </td>
                    <td className="p-3">{formatTransactionStatus(t.status)}</td>
                    <td className="p-3 text-right tabular-nums">{t.totalFormatted}</td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <LinesSheetButton
                          businessSlug={businessSlug}
                          locationSlug={locationSlug}
                          transactionId={t.id}
                          trigger="icon"
                        />
                        <ReceiptSheetButton
                          businessSlug={businessSlug}
                          locationSlug={locationSlug}
                          transactionId={t.id}
                          trigger="icon"
                        />
                        <VoidTransactionButton
                          businessSlug={businessSlug}
                          locationSlug={locationSlug}
                          transactionId={t.id}
                          transactionStatus={t.status}
                          confirmOrderLabel={formatOrderNumberLabel(createdAt, t.queueNumber)}
                          trigger="icon"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
