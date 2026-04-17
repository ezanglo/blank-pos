"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createProductPrice,
  deleteProductPrice,
  updateProductPrice,
} from "@/lib/actions/catalog-product-prices"
import { getProductDetailForEdit, type ProductDetailDTO } from "@/lib/actions/catalog-products"
import type { ProductCategoryVariantRow } from "@/lib/db/schema-catalog"
import type { ProductListRow } from "@/lib/queries/catalog"

import { CatalogProductsRootError } from "./catalog-products-root-error"

export function CatalogProductPricesDialog({
  anchorRow,
  onClose,
  businessSlug,
  categoryVariants,
}: {
  anchorRow: ProductListRow | null
  onClose: () => void
  businessSlug: string
  categoryVariants: ProductCategoryVariantRow[]
}) {
  const router = useRouter()
  const [pricesDetail, setPricesDetail] = useState<ProductDetailDTO | null>(null)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [pricesView, setPricesView] = useState<"list" | "edit">("list")
  const [priceEditRow, setPriceEditRow] = useState<ProductDetailDTO["prices"][0] | null>(null)
  const [priceDialogError, setPriceDialogError] = useState<string | null>(null)
  const [priceBusy, setPriceBusy] = useState(false)
  const [newVariantId, setNewVariantId] = useState("")
  const [newPriceAmount, setNewPriceAmount] = useState("")
  const [newPriceDefault, setNewPriceDefault] = useState(false)
  const [eVariantId, setEVariantId] = useState("")
  const [eAmount, setEAmount] = useState("")
  const [eDefault, setEDefault] = useState(false)

  const variantsForPricesDialog = useMemo(() => {
    const cid = pricesDetail?.product.categoryId
    if (!cid) return []
    return categoryVariants.filter((v) => v.categoryId === cid).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [categoryVariants, pricesDetail?.product.categoryId])

  const resetPriceDialogForms = useCallback(() => {
    setPriceDialogError(null)
    setPricesView("list")
    setPriceEditRow(null)
    setNewVariantId("")
    setNewPriceAmount("")
    setNewPriceDefault(false)
    setEVariantId("")
    setEAmount("")
    setEDefault(false)
  }, [])

  useEffect(() => {
    if (!anchorRow) {
      setPricesDetail(null)
      resetPriceDialogForms()
      return
    }
    let cancelled = false
    setPriceDialogError(null)
    resetPriceDialogForms()
    setPricesLoading(true)
    ;(async () => {
      try {
        const d = await getProductDetailForEdit(businessSlug, anchorRow.product.id)
        if (cancelled) return
        if (!d) {
          setPriceDialogError("Product not found.")
          return
        }
        setPricesDetail(d)
        setNewPriceDefault(d.prices.length === 0)
        const vars = categoryVariants
          .filter((v) => v.categoryId === d.product.categoryId)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
        const used = new Set(d.prices.map((p) => p.categoryVariantId).filter(Boolean) as string[])
        const free = vars.find((v) => !used.has(v.id))
        setNewVariantId(free?.id ?? vars[0]?.id ?? "")
      } catch (e) {
        if (!cancelled) {
          setPriceDialogError(e instanceof Error ? e.message : "Something went wrong.")
        }
      } finally {
        if (!cancelled) setPricesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [anchorRow, businessSlug, categoryVariants, resetPriceDialogForms])

  const reloadPricesDetail = useCallback(async () => {
    if (!anchorRow) return
    const d = await getProductDetailForEdit(businessSlug, anchorRow.product.id)
    if (d) setPricesDetail(d)
  }, [businessSlug, anchorRow])

  const handleClose = () => {
    setPricesDetail(null)
    resetPriceDialogForms()
    onClose()
  }

  return (
    <Dialog
      open={!!anchorRow}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pricesView === "edit" && priceEditRow
              ? "Edit variant price"
              : `Variants · ${anchorRow?.product.name ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            Each price is tied to a category variant (label and sort order follow the variant). Amounts use two
            decimal places (minor units as integers).
          </DialogDescription>
        </DialogHeader>

        {pricesLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : pricesView === "edit" && priceEditRow && pricesDetail ? (
          <div className="grid gap-4">
            <CatalogProductsRootError message={priceDialogError ?? undefined} />
            {variantsForPricesDialog.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Add variants for this category under Settings → Categories before you can attach prices.
              </p>
            ) : (
              <>
                <Field>
                  <FieldLabel>Variant</FieldLabel>
                  <Select value={eVariantId || undefined} onValueChange={(v) => setEVariantId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select variant">
                        {variantsForPricesDialog.find((x) => x.id === eVariantId)?.label ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {variantsForPricesDialog.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <p className="text-muted-foreground text-xs">
                  Sort order{" "}
                  <span className="text-foreground font-medium">
                    {variantsForPricesDialog.find((x) => x.id === eVariantId)?.sortOrder ?? "—"}
                  </span>{" "}
                  (from variant)
                </p>
                <Field>
                  <FieldLabel>Amount</FieldLabel>
                  <Input value={eAmount} onChange={(e) => setEAmount(e.target.value)} placeholder="0.00" />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={eDefault} onCheckedChange={(v) => setEDefault(v === true)} />
                  Default price
                </label>
              </>
            )}
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPricesView("list")
                  setPriceEditRow(null)
                  setPriceDialogError(null)
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={priceBusy || !eVariantId || variantsForPricesDialog.length === 0}
                onClick={async () => {
                  if (!pricesDetail || !eVariantId) return
                  setPriceBusy(true)
                  setPriceDialogError(null)
                  try {
                    await updateProductPrice(businessSlug, {
                      id: priceEditRow.id,
                      productId: pricesDetail.product.id,
                      categoryVariantId: eVariantId,
                      amount: eAmount,
                      isDefault: eDefault,
                    })
                    setPricesView("list")
                    setPriceEditRow(null)
                    await reloadPricesDetail()
                    router.refresh()
                  } catch (e) {
                    setPriceDialogError(e instanceof Error ? e.message : "Something went wrong.")
                  } finally {
                    setPriceBusy(false)
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </div>
        ) : pricesDetail ? (
          <div className="grid gap-4">
            <CatalogProductsRootError message={priceDialogError ?? undefined} />
            {variantsForPricesDialog.length === 0 ? (
              <p className="border-border bg-muted/40 rounded-xl border px-3 py-2 text-sm">
                Add variants for this category under <strong>Categories</strong> before you can set variant prices
                here.
              </p>
            ) : null}
            <div className="space-y-2 rounded-xl border">
              {pricesDetail.prices.length === 0 ? (
                <p className="text-muted-foreground p-4 text-sm">No variant prices yet.</p>
              ) : (
                <ul className="divide-y">
                  {pricesDetail.prices.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {p.label}
                          {p.isDefault ? (
                            <span className="text-muted-foreground ml-2 text-xs font-normal">Default</span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground text-xs">{p.amount}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit price"
                          onClick={() => {
                            setPriceDialogError(null)
                            setPriceEditRow(p)
                            setEVariantId(p.categoryVariantId ?? "")
                            setEAmount(p.amount)
                            setEDefault(p.isDefault)
                            setPricesView("edit")
                          }}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Delete price"
                          disabled={priceBusy}
                          onClick={async () => {
                            if (!pricesDetail) return
                            setPriceBusy(true)
                            setPriceDialogError(null)
                            try {
                              await deleteProductPrice(businessSlug, pricesDetail.product.id, p.id)
                              await reloadPricesDetail()
                              router.refresh()
                            } catch (e) {
                              setPriceDialogError(e instanceof Error ? e.message : "Something went wrong.")
                            } finally {
                              setPriceBusy(false)
                            }
                          }}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-medium">Add variant price</p>
              {variantsForPricesDialog.length === 0 ? null : (
                <div className="grid gap-3">
                  <Field>
                    <FieldLabel>Variant</FieldLabel>
                    <Select value={newVariantId || undefined} onValueChange={(v) => setNewVariantId(v ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select variant">
                          {variantsForPricesDialog.find((x) => x.id === newVariantId)?.label ?? null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {variantsForPricesDialog.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <p className="text-muted-foreground text-xs">
                    Sort order{" "}
                    <span className="text-foreground font-medium">
                      {variantsForPricesDialog.find((x) => x.id === newVariantId)?.sortOrder ?? "—"}
                    </span>{" "}
                    (from variant)
                  </p>
                  <Field>
                    <FieldLabel>Amount</FieldLabel>
                    <Input
                      value={newPriceAmount}
                      onChange={(e) => setNewPriceAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={newPriceDefault} onCheckedChange={(v) => setNewPriceDefault(v === true)} />
                    Default price
                  </label>
                </div>
              )}
              <Button
                type="button"
                className="mt-3"
                variant="secondary"
                disabled={priceBusy || !pricesDetail || !newVariantId || variantsForPricesDialog.length === 0}
                onClick={async () => {
                  if (!pricesDetail || !newVariantId) return
                  setPriceBusy(true)
                  setPriceDialogError(null)
                  try {
                    await createProductPrice(businessSlug, {
                      productId: pricesDetail.product.id,
                      categoryVariantId: newVariantId,
                      amount: newPriceAmount,
                      isDefault: newPriceDefault,
                    })
                    setNewPriceAmount("")
                    const next = await getProductDetailForEdit(businessSlug, pricesDetail.product.id)
                    if (next) {
                      setPricesDetail(next)
                      const vars = categoryVariants
                        .filter((v) => v.categoryId === next.product.categoryId)
                        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
                      const used = new Set(next.prices.map((x) => x.categoryVariantId).filter(Boolean) as string[])
                      const free = vars.find((v) => !used.has(v.id))
                      setNewVariantId(free?.id ?? vars[0]?.id ?? "")
                      setNewPriceDefault(false)
                    }
                    router.refresh()
                  } catch (e) {
                    setPriceDialogError(e instanceof Error ? e.message : "Something went wrong.")
                  } finally {
                    setPriceBusy(false)
                  }
                }}
              >
                Add variant price
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <CatalogProductsRootError message={priceDialogError ?? undefined} />
        )}
      </DialogContent>
    </Dialog>
  )
}
