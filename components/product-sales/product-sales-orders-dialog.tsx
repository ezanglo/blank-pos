"use client"

import * as React from "react"

import { loadProductSalesOrdersPage } from "@/lib/actions/product-sales-orders"
import { LinesSheetButton } from "@/components/transactions/lines-sheet-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ProductSalesOrdersDialog({
  businessSlug,
  locationSlug,
  productId,
  productName,
  orderCount,
  fromStr,
  toStr,
  statusParam,
}: {
  businessSlug: string
  locationSlug: string
  productId: string
  productName: string
  orderCount: number
  fromStr: string
  toStr: string
  statusParam: string
}) {
  const [open, setOpen] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<Awaited<ReturnType<typeof loadProductSalesOrdersPage>> | null>(
    null,
  )

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setData(null)
    void loadProductSalesOrdersPage(
      businessSlug,
      locationSlug,
      productId,
      fromStr,
      toStr,
      statusParam,
      page,
    ).then((r) => {
      if (!cancelled) {
        setData(r)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, page, businessSlug, locationSlug, productId, fromStr, toStr, statusParam])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setPage(1)
          setData(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-auto rounded-full p-0 font-normal hover:bg-muted/60"
          />
        }
      >
        <Badge variant="secondary" className="tabular-nums">
          {orderCount} {orderCount === 1 ? "order" : "orders"}
        </Badge>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,40rem)] flex-col gap-4 sm:max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Orders with this product</DialogTitle>
          <DialogDescription className="line-clamp-2">{productName}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-2 text-left font-medium sm:p-3">When</th>
                <th className="p-2 text-left font-medium sm:p-3">#</th>
                <th className="hidden p-2 text-left font-medium sm:table-cell sm:p-3">Name</th>
                <th className="p-2 text-left font-medium sm:p-3">Status</th>
                <th className="p-2 text-right font-medium sm:p-3">Total</th>
                <th className="p-2 text-right font-medium sm:p-3">Lines</th>
              </tr>
            </thead>
            <tbody>
              {loading || !data ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground p-6 text-center">
                    Loading…
                  </td>
                </tr>
              ) : !data.ok ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground p-6 text-center">
                    {data.error === "forbidden"
                      ? "You do not have access to this report."
                      : "Invalid date range."}
                  </td>
                </tr>
              ) : data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground p-6 text-center">
                    No transactions in this range include this product (with the current status filter).
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-2 whitespace-nowrap tabular-nums sm:p-3">
                      {new Date(row.createdAtIso).toLocaleString()}
                    </td>
                    <td className="p-2 tabular-nums sm:p-3">{row.queueLabel}</td>
                    <td
                      className="text-muted-foreground hidden max-w-40 truncate p-2 sm:table-cell sm:p-3"
                      title={row.customerCallName ?? undefined}
                    >
                      {row.customerCallName?.trim() ? row.customerCallName.trim() : "—"}
                    </td>
                    <td className="p-2 sm:p-3">{row.statusLabel}</td>
                    <td className="p-2 text-right tabular-nums sm:p-3">{row.totalDisplay}</td>
                    <td className="p-2 text-right sm:p-3">
                      <div className="flex justify-end">
                        <LinesSheetButton
                          businessSlug={businessSlug}
                          locationSlug={locationSlug}
                          transactionId={row.id}
                          trigger="icon"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.ok && data.total > 0 ? (
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <p>
              Page {data.page} of {data.totalPages} ({data.total} orders)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || data.page <= 1}
                onClick={() => setPage((x) => Math.max(1, x - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || data.page >= data.totalPages}
                onClick={() => setPage((x) => x + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
