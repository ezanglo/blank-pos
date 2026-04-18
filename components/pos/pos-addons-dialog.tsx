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
import type { PosCategoryInstruction } from "@/lib/queries/catalog"
import type { PosCategoryAddon } from "@/lib/queries/catalog-addons"
import type { PosProductCard } from "@/lib/pos/pos-types"
import {
  type PosCartAddonSelection,
  type PosCartInstructionSelection,
} from "@/lib/stores/pos-cart-store"
import { formatMinorToDecimal2, parseMinorFromSerialized } from "@/lib/money"
import { cn } from "@/lib/utils"

export type PosLineOptionsConfirm =
  | { variant: "addons"; selections: PosCartAddonSelection[] }
  | { variant: "instructions"; instructionSelections: PosCartInstructionSelection[] }

type Props = {
  variant: "addons" | "instructions"
  product: PosProductCard | null
  productPriceId: string | null
  quantity: number
  addons: PosCategoryAddon[]
  instructions: PosCategoryInstruction[]
  /** When this string changes while `open`, checkboxes reset from `initial*Ids`. */
  prefillKey: string
  initialAddonIds: string[]
  initialInstructionIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: PosLineOptionsConfirm) => void
}

export function PosAddonsDialog({
  variant,
  product,
  productPriceId,
  quantity,
  addons,
  instructions,
  prefillKey,
  initialAddonIds,
  initialInstructionIds,
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [selectedAddons, setSelectedAddons] = React.useState<Set<string>>(() => new Set())
  const [selectedInstructions, setSelectedInstructions] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    if (!open) return
    setSelectedAddons(new Set(initialAddonIds))
    setSelectedInstructions(new Set(initialInstructionIds))
    // Intentionally only when dialog opens or the cart line’s options identity changes — not on every
    // parent render (fresh array refs would reset toggles while the user edits).
  }, [open, prefillKey])

  const priceRow = product && productPriceId ? product.prices.find((p) => p.id === productPriceId) : null

  function toggleAddon(id: string, checked: boolean) {
    setSelectedAddons((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleInstruction(id: string, checked: boolean) {
    setSelectedInstructions((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function confirm() {
    if (!product || !productPriceId || !priceRow) return
    if (variant === "addons") {
      const selections = addons
        .filter((a) => selectedAddons.has(a.id))
        .map((a) => ({
          addonId: a.id,
          name: a.name,
          unitPriceMinor: a.amountMinor,
          currency: a.currency,
          quantity: 1,
        }))
      onConfirm({ variant: "addons", selections })
    } else {
      const instructionSelections = instructions
        .filter((i) => selectedInstructions.has(i.id))
        .map((i) => ({ instructionId: i.id, label: i.label }))
      onConfirm({ variant: "instructions", instructionSelections })
    }
    onOpenChange(false)
  }

  const title = variant === "addons" ? "Add-ons" : "Special instructions"
  const showAddons = variant === "addons" && addons.length > 0
  const showInstructions = variant === "instructions" && instructions.length > 0

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
                    {title}
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
            <DialogTitle className="sr-only">{title}</DialogTitle>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {!product ? (
            <p className="px-2 py-6 text-center text-base text-muted-foreground">No product.</p>
          ) : !showAddons && !showInstructions ? (
            <p className="px-2 py-6 text-center text-base text-muted-foreground">
              Nothing to configure here.
            </p>
          ) : showAddons ? (
            <ul className="flex flex-col gap-2" role="list" aria-label="Add-ons">
              {addons.map((a) => {
                const unit = formatMinorToDecimal2(parseMinorFromSerialized(a.amountMinor))
                const isOn = selectedAddons.has(a.id)
                return (
                  <li key={a.id}>
                    <label
                      className={cn(
                        "flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3 shadow-sm",
                        isOn && "border-primary/50 bg-muted/40",
                      )}
                    >
                      <Checkbox checked={isOn} onCheckedChange={(v) => toggleAddon(a.id, v === true)} />
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
          ) : (
            <ul className="flex flex-col gap-2" role="list" aria-label="Special instructions">
              {instructions.map((i) => {
                const isOn = selectedInstructions.has(i.id)
                return (
                  <li key={i.id}>
                    <label
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3 shadow-sm",
                        isOn && "border-primary/50 bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={isOn}
                        onCheckedChange={(v) => toggleInstruction(i.id, v === true)}
                      />
                      <span className="min-w-0 flex-1 font-semibold leading-tight">{i.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border bg-muted/15 p-4 sm:justify-stretch">
          <Button type="button" className="h-14 w-full text-base font-medium" onClick={confirm}>
            Save
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
