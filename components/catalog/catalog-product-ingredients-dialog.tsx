"use client"

import { FlaskConicalIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { getProductDetailForEdit, saveProductRecipe } from "@/lib/actions/catalog-products"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatMinorToDecimal2, ingredientLineCostMinor, parseDecimal3ToMilli } from "@/lib/money"

import { CatalogProductsRootError } from "./catalog-products-root-error"

type InvPick = { id: string; name: string; unit: string; costMinor: string }
type IngRow = { inventoryItemId: string; quantity: string }

export function CatalogProductIngredientsDialog({
  open,
  onOpenChange,
  businessSlug,
  productId,
  productName,
  inventory,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessSlug: string
  productId: string
  productName: string
  inventory: InvPick[]
  onSaved: () => void
}) {
  const [lines, setLines] = useState<IngRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !productId) return
    let cancelled = false
    setError(null)
    setLoadError(null)
    setLoading(true)
    setLines([])
    ;(async () => {
      const d = await getProductDetailForEdit(businessSlug, productId)
      if (cancelled) return
      setLoading(false)
      if (!d) {
        setLoadError("Product not found.")
        return
      }
      setLines(
        d.ingredients.length > 0
          ? d.ingredients.map((r) => ({ ...r }))
          : [{ inventoryItemId: inventory[0]?.id ?? "", quantity: "1" }],
      )
    })()
    return () => {
      cancelled = true
    }
  }, [open, productId, businessSlug, inventory])

  const costByInvId = useMemo(() => {
    const m = new Map<string, bigint>()
    for (const i of inventory) {
      m.set(i.id, BigInt(i.costMinor))
    }
    return m
  }, [inventory])

  const rolledUpMinor = useMemo(() => {
    let t = BigInt(0)
    for (const line of lines) {
      if (!line.inventoryItemId) continue
      const c = costByInvId.get(line.inventoryItemId)
      if (c == null) continue
      try {
        const milli = parseDecimal3ToMilli(line.quantity)
        t += ingredientLineCostMinor(c, milli)
      } catch {
        /* skip invalid qty */
      }
    }
    return t
  }, [costByInvId, lines])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const payload = lines
        .filter((l) => l.inventoryItemId.trim().length > 0)
        .map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: l.quantity.trim() || "1" }))
      await saveProductRecipe(businessSlug, {
        productId,
        ingredients: payload.length > 0 ? payload : [],
      })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConicalIcon className="size-5 shrink-0 opacity-80" aria-hidden />
            Recipe / ingredients
          </DialogTitle>
          <DialogDescription>
            Inventory drawn per <strong>one unit sold</strong> (up to three decimal places).{" "}
            <span className="text-foreground font-medium">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <CatalogProductsRootError message={error ?? loadError ?? undefined} />
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading recipe…</p>
          ) : inventory.length === 0 ? (
            <p className="text-muted-foreground text-sm">Add inventory items first, then link them here.</p>
          ) : loadError ? null : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel className="mb-0">Lines</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLines((rows) => [...rows, { inventoryItemId: inventory[0]?.id ?? "", quantity: "1" }])
                    }
                  >
                    Add line
                  </Button>
                </div>
                {lines.map((line, idx) => {
                  const inv = inventory.find((i) => i.id === line.inventoryItemId)
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                      <Select
                        value={line.inventoryItemId || undefined}
                        onValueChange={(v) =>
                          setLines((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, inventoryItemId: v ?? "" } : r)),
                          )
                        }
                      >
                        <SelectTrigger className="col-span-7">
                          <SelectValue placeholder="Item">{inv ? `${inv.name} (${inv.unit})` : null}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name} ({i.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="col-span-5"
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)),
                          )
                        }
                        placeholder="Qty (3 dp)"
                      />
                    </div>
                  )
                })}
              </div>
              <p className="text-muted-foreground text-sm">
                Rolled-up cost (estimate):{" "}
                <span className="text-foreground font-medium">{formatMinorToDecimal2(rolledUpMinor)}</span>
              </p>
              <p className="text-muted-foreground text-xs">
                Clear all lines and save to remove the recipe. The product will no longer be treated as composite.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || loading || !!loadError || inventory.length === 0}
            onClick={submit}
          >
            Save recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
