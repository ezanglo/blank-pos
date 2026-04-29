"use client"

import * as React from "react"

import { ListOrderedIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import {
  loadDashboardTransactionLines,
  type DashboardTransactionLinesPreview,
} from "@/lib/actions/dashboard-recent-preview"
import { formatOrderNumberLabel } from "@/lib/format-order-number"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type LinesSheetButtonProps = {
  businessSlug: string
  locationSlug: string
  transactionId: string
  trigger?: "text" | "icon"
  /** Visible label when `trigger` is `"text"`. */
  textLabel?: string
}

export function LinesSheetButton({
  businessSlug,
  locationSlug,
  transactionId,
  trigger = "text",
  textLabel = "Lines",
}: LinesSheetButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<DashboardTransactionLinesPreview | null>(null)

  React.useEffect(() => {
    if (!open) {
      setLoading(false)
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setData(null)
    void loadDashboardTransactionLines(businessSlug, locationSlug, transactionId).then((next) => {
      if (cancelled) return
      setLoading(false)
      if (!next) {
        toast.error("Could not load transaction lines.")
        setOpen(false)
        return
      }
      setData(next)
    })
    return () => {
      cancelled = true
    }
  }, [open, businessSlug, locationSlug, transactionId])

  return (
    <>
      {trigger === "icon" ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="View line items"
          onClick={() => setOpen(true)}
        >
          <ListOrderedIcon />
        </Button>
      ) : (
        <button
          type="button"
          className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
          onClick={() => setOpen(true)}
        >
          {textLabel}
        </button>
      )}
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setData(null)
          setOpen(next)
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-label="Transaction lines"
          className={cn(
            "flex min-h-0 flex-col gap-0 border-border/80 bg-background text-popover-foreground shadow-xl",
            "inset-y-0! left-auto! right-0! h-dvh! max-h-dvh! max-w-none!",
            "w-[min(100dvw,480px)]! sm:w-[min(100dvw,480px)]! sm:max-w-[480px]!",
            "overflow-hidden rounded-none border-l p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:hidden",
          )}
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
              aria-label="Close lines"
              onClick={() => {
                setOpen(false)
                setData(null)
              }}
            >
              <XIcon />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
            {loading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Loading lines…</p>
            ) : data ? (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm tabular-nums">
                  {new Date(data.createdAtIso).toLocaleString()} ·{" "}
                  {formatOrderNumberLabel(new Date(data.createdAtIso), data.queueNumber)} · {data.statusLabel}
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
                      {data.lines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted-foreground p-6 text-center">
                            No line items.
                          </td>
                        </tr>
                      ) : (
                        data.lines.map((line) => (
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
    </>
  )
}
