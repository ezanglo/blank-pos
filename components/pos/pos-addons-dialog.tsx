"use client"

import * as React from "react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PosCategoryAddon } from "@/lib/queries/catalog-addons"
import type { PosProductCard } from "@/lib/pos/pos-types"
import { formatMinorToDecimal2, parseMinorFromSerialized } from "@/lib/money"
import { cn } from "@/lib/utils"

export type PosAddonDialogPick = {
  product: PosProductCard
  productPriceId: string
  quantity: number
  /** Per-unit add-on quantities (each selected add-on defaults to 1). */
  selections: { addonId: string; name: string; unitPriceMinor: string; currency: string; quantity: number }[]
}

type Props = {
  product: PosProductCard | null
  productPriceId: string | null
  quantity: number
  addons: PosCategoryAddon[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (pick: PosAddonDialogPick) => void
}

export function PosAddonsDialog({
  product,
  productPriceId,
  quantity,
  addons,
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    if (open) setSelected(new Set())
  }, [open, product?.id, productPriceId])

  const priceRow = product && productPriceId ? product.prices.find((p) => p.id === productPriceId) : null

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function confirm() {
    if (!product || !productPriceId || !priceRow) return
    const selections = addons
      .filter((a) => selected.has(a.id))
      .map((a) => ({
        addonId: a.id,
        name: a.name,
        unitPriceMinor: a.amountMinor,
        currency: a.currency,
        quantity: 1,
      }))
    onConfirm({ product, productPriceId, quantity, selections })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="touch-manipulation flex max-h-[min(88vh,720px)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
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
                    Add-ons
                  </DialogTitle>
                  <DialogDescription className="text-left text-sm">
                    {product.name}
                    {priceRow ? (
                      <>
                        {" · "}
                        <span className="font-medium text-foreground">{priceRow.label}</span>
                        {" · ×"}
                        {quantity}
                      </>
                    ) : null}
                  </DialogDescription>
                </div>
              </div>
            </>
          ) : (
            <DialogTitle className="sr-only">Add-ons</DialogTitle>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {!product || addons.length === 0 ? (
            <p className="px-2 py-6 text-center text-base text-muted-foreground">No add-ons for this category.</p>
          ) : (
            <ul className="flex flex-col gap-2" role="list" aria-label="Add-ons">
              {addons.map((a) => {
                const unit = formatMinorToDecimal2(parseMinorFromSerialized(a.amountMinor))
                const isOn = selected.has(a.id)
                return (
                  <li key={a.id}>
                    <label
                      className={cn(
                        "flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3 shadow-sm",
                        isOn && "border-primary/50 bg-muted/40",
                      )}
                    >
                      <Checkbox checked={isOn} onCheckedChange={(v) => toggle(a.id, v === true)} />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold leading-tight">{a.name}</span>
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          +{unit} {a.currency}
                        </span>
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border bg-muted/15 p-4 sm:justify-stretch">
          <Button type="button" className="h-14 w-full text-base font-medium" onClick={confirm}>
            Add to cart
          </Button>
          <DialogClose
            render={<Button type="button" variant="outline" className="h-12 w-full min-w-0 text-base font-medium" />}
          >
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
