import Link from "next/link"
import { notFound } from "next/navigation"

import { VoidTransactionButton } from "@/components/reports/void-transaction-button"
import { ReceiptSheetButton } from "@/components/transactions/receipt-sheet-button"
import { buttonVariants } from "@/components/ui/button"
import { formatTransactionStatus } from "@/lib/db/schema-transactions"
import { formatMinorToDecimal2 } from "@/lib/money"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import { formatOrderNumberLabel } from "@/lib/format-order-number"
import { getTransactionReportDetail } from "@/lib/queries/reports"
import { requireSession } from "@/lib/server-auth"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string; transactionId: string }>
}) {
  const { businessSlug, locationSlug, transactionId } = await params
  const session = await requireSession()
  const row = await getLocationForUserByBusinessAndLocationSlug(
    businessSlug,
    locationSlug,
    session.user.id,
  )
  if (!row) notFound()

  const detail = await getTransactionReportDetail(row.organization.id, row.location.id, transactionId)
  if (!detail) notFound()

  const { transaction, lines } = detail
  const backHref = `/${businessSlug}/l/${locationSlug}/transactions`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-2 -ml-2 h-auto px-2")}
          >
            ← Transactions
          </Link>
          <h2 className="text-lg font-semibold">Transaction lines</h2>
          <p className="text-muted-foreground mt-1 text-sm tabular-nums">
            {transaction.createdAt.toLocaleString()} · {formatOrderNumberLabel(transaction.createdAt, transaction.queueNumber)} ·{" "}
            <span>{formatTransactionStatus(transaction.status)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VoidTransactionButton
            businessSlug={businessSlug}
            locationSlug={locationSlug}
            transactionId={transaction.id}
            transactionStatus={transaction.status}
            confirmOrderLabel={formatOrderNumberLabel(transaction.createdAt, transaction.queueNumber)}
          />
          <ReceiptSheetButton
            businessSlug={businessSlug}
            transactionId={transaction.id}
            variant="outline"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left font-medium">Product</th>
              <th className="p-3 text-right font-medium">Qty</th>
              <th className="p-3 text-right font-medium">Unit</th>
              <th className="p-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground p-6 text-center">
                  No line items.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="p-3">{line.productName}</td>
                  <td className="p-3 text-right tabular-nums">{line.quantity}</td>
                  <td className="p-3 text-right tabular-nums">{formatMinorToDecimal2(line.unitPriceMinor)}</td>
                  <td className="p-3 text-right tabular-nums">{formatMinorToDecimal2(line.subtotalMinor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
