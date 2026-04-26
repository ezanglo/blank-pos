"use client"

import * as React from "react"

import { XIcon } from "lucide-react"
import { toast } from "sonner"

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
import type { PosReceiptPreviewModel } from "@/lib/pos/receipt-preview"
import { cn } from "@/lib/utils"

type ReceiptSheetButtonProps = {
  businessSlug: string
  transactionId: string
  variant?: "link" | "outline"
}

export function ReceiptSheetButton({
  businessSlug,
  transactionId,
  variant = "link",
}: ReceiptSheetButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [model, setModel] = React.useState<PosReceiptPreviewModel | null>(null)

  React.useEffect(() => {
    if (!open) {
      setLoading(false)
      setModel(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setModel(null)
    void loadPosReceiptPreview(businessSlug, transactionId).then((next) => {
      if (cancelled) return
      setLoading(false)
      if (!next) {
        toast.error("Could not load receipt.")
        setOpen(false)
        return
      }
      setModel(next)
    })
    return () => {
      cancelled = true
    }
  }, [open, businessSlug, transactionId])

  return (
    <>
      <button
        type="button"
        className={cn(
          buttonVariants({ variant, size: "sm" }),
          variant === "link" ? "h-auto p-0" : undefined,
        )}
        onClick={() => setOpen(true)}
      >
        Receipt
      </button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setModel(null)
          setOpen(next)
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-label="Receipt preview"
          className={cn(
            "flex min-h-0 flex-col gap-0 border-border/80 bg-background text-popover-foreground shadow-xl",
            "inset-y-0! left-auto! right-0! h-dvh! max-h-dvh! max-w-none!",
            "w-[min(100dvw,420px)]! sm:w-[min(100dvw,420px)]! sm:max-w-[420px]!",
            "overflow-hidden rounded-none border-l p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>button]:hidden",
          )}
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
                setOpen(false)
                setModel(null)
              }}
            >
              <XIcon />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 [-webkit-overflow-scrolling:touch]">
            {loading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Loading receipt…</p>
            ) : model ? (
              <PosReceiptDocument
                model={model}
                className="max-w-none py-0"
                footerSlot={
                  <>
                    <PrintReceiptButton />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-4xl px-3"
                      onClick={() => {
                        setOpen(false)
                        setModel(null)
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
    </>
  )
}
