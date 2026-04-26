"use client"

import { XIcon } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { loadDashboardTransactionLines } from "@/lib/actions/dashboard-recent-preview"
import { loadPosReceiptPreview } from "@/lib/actions/pos-receipt"
import { PosReceiptDocument } from "@/components/pos/pos-receipt-document"
import { PrintReceiptButton } from "@/components/pos/print-receipt-button"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { DashboardTransactionLinesPreview } from "@/lib/actions/dashboard-recent-preview"
import { formatTransactionStatus } from "@/lib/db/schema-transactions"
import type { PosReceiptPreviewModel } from "@/lib/pos/receipt-preview"
import { cn } from "@/lib/utils"

export type DashboardRecentSaleRow = {
  id: string
  createdAtIso: string
  queueNumber: number | null
  status: string
  totalFormatted: string
}

const receiptSheetClassName = cn(
  "flex min-h-0 flex-col gap-0 border-border/80 bg-background text-popover-foreground shadow-xl",
  "inset-y-0! left-auto! right-0! h-dvh! max-h-dvh! max-w-none!",
  "w-[min(100dvw,420px)]! sm:w-[min(100dvw,420px)]! sm:max-w-[420px]!",
  "overflow-hidden rounded-none border-l p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:hidden",
)

const linesSheetClassName = cn(
  "flex min-h-0 flex-col gap-0 border-border/80 bg-background text-popover-foreground shadow-xl",
  "inset-y-0! left-auto! right-0! h-dvh! max-h-dvh! max-w-none!",
  "w-[min(100dvw,480px)]! sm:w-[min(100dvw,480px)]! sm:max-w-[480px]!",
  "overflow-hidden rounded-none border-l p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:hidden",
)

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

  const [linesTxId, setLinesTxId] = React.useState<string | null>(null)
  const [linesData, setLinesData] = React.useState<DashboardTransactionLinesPreview | null>(null)
  const [linesLoading, setLinesLoading] = React.useState(false)

  const [receiptTxId, setReceiptTxId] = React.useState<string | null>(null)
  const [receiptModel, setReceiptModel] = React.useState<PosReceiptPreviewModel | null>(null)
  const [receiptLoading, setReceiptLoading] = React.useState(false)

  React.useEffect(() => {
    if (!linesTxId) {
      setLinesData(null)
      setLinesLoading(false)
      return
    }
    let cancelled = false
    setLinesLoading(true)
    setLinesData(null)
    void loadDashboardTransactionLines(businessSlug, locationSlug, linesTxId).then((data) => {
      if (cancelled) return
      setLinesLoading(false)
      if (data) {
        setLinesData(data)
      } else {
        toast.error("Could not load transaction lines.")
        setLinesTxId(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [linesTxId, businessSlug, locationSlug])

  React.useEffect(() => {
    if (!receiptTxId) {
      setReceiptModel(null)
      setReceiptLoading(false)
      return
    }
    let cancelled = false
    setReceiptLoading(true)
    setReceiptModel(null)
    void loadPosReceiptPreview(businessSlug, receiptTxId).then((m) => {
      if (cancelled) return
      setReceiptLoading(false)
      if (m) {
        setReceiptModel(m)
      } else {
        toast.error("Could not load receipt.")
        setReceiptTxId(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [receiptTxId, businessSlug])

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
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-right font-medium">Total</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground p-6 text-center">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 whitespace-nowrap tabular-nums">
                    {new Date(t.createdAtIso).toLocaleString()}
                  </td>
                  <td className="p-3 tabular-nums">{t.queueNumber ?? "—"}</td>
                  <td className="p-3">{formatTransactionStatus(t.status)}</td>
                  <td className="p-3 text-right tabular-nums">{t.totalFormatted}</td>
                  <td className="p-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                      <button
                        type="button"
                        className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
                        onClick={() => {
                          setReceiptTxId(null)
                          setReceiptModel(null)
                          setLinesTxId(t.id)
                        }}
                      >
                        Lines
                      </button>
                      <button
                        type="button"
                        className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
                        onClick={() => {
                          setLinesTxId(null)
                          setLinesData(null)
                          setReceiptTxId(t.id)
                        }}
                      >
                        Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet
        open={linesTxId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLinesTxId(null)
            setLinesData(null)
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-label="Transaction lines"
          className={linesSheetClassName}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Transaction lines</SheetTitle>
            <SheetDescription>Line items for this sale.</SheetDescription>
          </SheetHeader>
          <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
            <h2 className="text-base font-semibold tracking-tight">Transaction lines</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-11 shrink-0 rounded-xl"
              aria-label="Close"
              onClick={() => {
                setLinesTxId(null)
                setLinesData(null)
              }}
            >
              <XIcon />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
            {linesLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Loading lines…</p>
            ) : linesData ? (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm tabular-nums">
                  {new Date(linesData.createdAtIso).toLocaleString()} · #{linesData.queueNumber ?? "—"} ·{" "}
                  {linesData.statusLabel}
                </p>
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
                      {linesData.lines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted-foreground p-6 text-center">
                            No line items.
                          </td>
                        </tr>
                      ) : (
                        linesData.lines.map((line) => (
                          <tr key={line.id} className="border-t">
                            <td className="p-3">{line.productName}</td>
                            <td className="p-3 text-right tabular-nums">{line.quantity}</td>
                            <td className="p-3 text-right tabular-nums">{line.unit}</td>
                            <td className="p-3 text-right tabular-nums">{line.subtotal}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={receiptTxId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setReceiptTxId(null)
            setReceiptModel(null)
          }
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-label="Receipt preview"
          className={receiptSheetClassName}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Receipt</SheetTitle>
            <SheetDescription>Preview and print the transaction receipt.</SheetDescription>
          </SheetHeader>
          <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
            <h2 className="text-base font-semibold tracking-tight">Receipt</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto size-11 shrink-0 rounded-xl"
              aria-label="Close receipt"
              onClick={() => {
                setReceiptTxId(null)
                setReceiptModel(null)
              }}
            >
              <XIcon />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
            {receiptLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Loading receipt…</p>
            ) : receiptModel ? (
              <PosReceiptDocument
                model={receiptModel}
                className="max-w-none py-0"
                footerSlot={
                  <>
                    <PrintReceiptButton />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-4xl px-3"
                      onClick={() => {
                        setReceiptTxId(null)
                        setReceiptModel(null)
                      }}
                    >
                      Done
                    </Button>
                  </>
                }
                belowSlot={
                  <p className="text-muted-foreground mt-4 text-center text-xs">
                    For best results, enable background graphics in the print dialog if you want logo colors.
                  </p>
                }
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
