"use client"

import * as React from "react"
import Image from "next/image"
import { MinusIcon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PosProductCard } from "@/lib/pos/pos-types"
import { formatMinorToDecimal2, parseMinorFromSerialized } from "@/lib/money"
import { cn } from "@/lib/utils"

type Props = {
  product: PosProductCard | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPickPrice: (product: PosProductCard, priceId: string, quantity: number) => void
}

export function PosPricePickerDialog({ product, open, onOpenChange, onPickPrice }: Props) {
  const prices = product?.prices ?? []
  const [qty, setQty] = React.useState(1)

  React.useEffect(() => {
    if (open) setQty(1)
  }, [open, product?.id])

  function bump(delta: number) {
    setQty((q) => Math.max(1, Math.min(9999, q + delta)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="touch-manipulation flex max-h-[min(88vh,760px)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-5 pt-5 pr-14 pb-4 text-left">
          {product ? (
            <>
              <div className="flex gap-4">
                <div className="relative size-22 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt="" fill className="object-cover" sizes="88px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <DialogTitle className="text-left text-xl leading-snug font-semibold tracking-tight">
                    {product.name}
                  </DialogTitle>
                  <DialogDescription className="text-left text-sm">
                    {product.sku?.trim()
                      ? `SKU ${product.sku.trim()}`
                      : product.qrCode?.trim()
                        ? `Code ${product.qrCode.trim()}`
                        : "Set quantity, then tap a price to add"}
                  </DialogDescription>
                  {product.stockBadge === "out" ? (
                    <Badge variant="destructive" className="mt-2 w-fit text-xs font-semibold">
                      Out of stock
                    </Badge>
                  ) : product.stockBadge === "low" ? (
                    <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Low stock
                      {product.sellableUnits != null ? ` (~${product.sellableUnits} left)` : ""}
                    </p>
                  ) : product.stockBadge === "ok" ? (
                    <p className="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      On stock
                      {product.sellableUnits != null ? ` (~${product.sellableUnits} from recipe)` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <DialogTitle className="sr-only">Choose price</DialogTitle>
          )}
        </DialogHeader>

        {product && prices.length > 0 ? (
          <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-4">
            <p className="mb-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Quantity
            </p>
            <div className="mx-auto flex max-w-sm items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="size-14 shrink-0 rounded-2xl border-2 p-0 shadow-sm active:scale-95"
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                onClick={() => bump(-1)}
              >
                <MinusIcon className="size-7" />
              </Button>
              <div className="flex min-w-22 flex-col items-center justify-center rounded-2xl border-2 border-border bg-background px-4 py-2 shadow-inner">
                <span className="text-3xl font-bold tabular-nums leading-none tracking-tight">{qty}</span>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground uppercase">items</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="size-14 shrink-0 rounded-2xl border-2 p-0 shadow-sm active:scale-95"
                aria-label="Increase quantity"
                disabled={qty >= 9999}
                onClick={() => bump(1)}
              >
                <PlusIcon className="size-7" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {!product ? null : prices.length === 0 ? (
            <p className="px-2 py-6 text-center text-base text-muted-foreground">
              This product has no price yet. Add prices in catalog.
            </p>
          ) : (
            <>
              <p className="mb-3 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Choose price
              </p>
              <ul className="flex flex-col gap-2.5" role="listbox" aria-label="Prices for this product">
                {prices.map((pr) => {
                  const unitMinor = parseMinorFromSerialized(pr.amountMinor)
                  const amount = formatMinorToDecimal2(unitMinor)
                  const lineTotal = formatMinorToDecimal2(unitMinor * BigInt(qty))
                  return (
                    <li key={pr.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full min-h-20 flex-col gap-1 rounded-2xl border-2 border-border bg-background px-5 py-4 text-left shadow-sm sm:min-h-17",
                          "transition-[transform,colors,box-shadow] active:scale-[0.98] hover:border-primary/45 hover:bg-muted/50",
                          "focus-visible:ring-4 focus-visible:ring-ring/35 focus-visible:outline-none",
                        )}
                        onClick={() => {
                          onPickPrice(product, pr.id, qty)
                          onOpenChange(false)
                        }}
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="block text-lg font-semibold leading-tight">{pr.label}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{pr.currency}</span>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="block text-2xl font-bold tabular-nums tracking-tight">{amount}</span>
                            <span className="text-xs text-muted-foreground">each</span>
                          </div>
                        </div>
                        {qty > 1 ? (
                          <div className="border-t border-border/60 pt-2 text-sm font-medium text-foreground">
                            <span className="text-muted-foreground">Line total </span>
                            <span className="tabular-nums">{lineTotal}</span>
                            <span className="text-muted-foreground"> · ×{qty}</span>
                          </div>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border bg-muted/15 p-4 sm:flex-col sm:justify-stretch">
          <DialogClose
            render={
              <Button type="button" variant="outline" className="h-14 w-full min-w-0 text-base font-medium" />
            }
          >
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
