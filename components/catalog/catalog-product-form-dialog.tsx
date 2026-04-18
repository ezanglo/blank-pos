"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { createProduct, getProductDetailForEdit, updateProduct } from "@/lib/actions/catalog-products"
import { ProductImageUpload } from "./product-image-upload"
import { flushPendingImageUploads } from "@/lib/offline/pending-image-uploads"
import { formatMinorToDecimal2, ingredientLineCostMinor, parseDecimal3ToMilli } from "@/lib/money"
import type { ProductCategoryRow } from "@/lib/db/schema-catalog"

import { CatalogProductsRootError } from "./catalog-products-root-error"

export type CatalogProductFormLaunch = { mode: "create" } | { mode: "edit"; productId: string }

type Loc = { id: string; name: string }
type InvPick = { id: string; name: string; unit: string; costMinor: string }
type IngRow = { inventoryItemId: string; quantity: string }

export function CatalogProductFormDialog({
  launch,
  onClose,
  businessSlug,
  categories,
  locations,
  inventory,
  onSaved,
}: {
  launch: CatalogProductFormLaunch | null
  onClose: () => void
  businessSlug: string
  categories: ProductCategoryRow[]
  locations: Loc[]
  inventory: InvPick[]
  onSaved: () => void
}) {
  const open = launch !== null
  const editingId = launch?.mode === "edit" ? launch.productId : null

  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [sku, setSku] = useState("")
  const [qrCode, setQrCode] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isComposite, setIsComposite] = useState(false)
  const [trackInventory, setTrackInventory] = useState(false)
  const [availabilityMode, setAvailabilityMode] = useState<"all_locations" | "selected_locations_only">(
    "all_locations",
  )
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [ingredients, setIngredients] = useState<IngRow[]>([{ inventoryItemId: "", quantity: "1" }])

  const resetDefaults = useCallback(() => {
    setFormError(null)
    setLoadError(null)
    setName("")
    setDescription("")
    setCategoryId(categories[0]?.id ?? "")
    setSku("")
    setQrCode("")
    setImageUrl("")
    setIsActive(true)
    setIsComposite(false)
    setTrackInventory(false)
    setAvailabilityMode("all_locations")
    setSelectedLocationIds([])
    setIngredients([{ inventoryItemId: inventory[0]?.id ?? "", quantity: "1" }])
  }, [categories, inventory])

  useEffect(() => {
    if (!launch) return
    if (launch.mode === "create") {
      setDetailLoading(false)
      setLoadError(null)
      resetDefaults()
      return
    }
    let cancelled = false
    setLoadError(null)
    setFormError(null)
    setDetailLoading(true)
    resetDefaults()
    ;(async () => {
      const d = await getProductDetailForEdit(businessSlug, launch.productId)
      if (cancelled) return
      setDetailLoading(false)
      if (!d) {
        setLoadError("Product not found.")
        return
      }
      setName(d.product.name)
      setDescription(d.product.description ?? "")
      setCategoryId(d.product.categoryId)
      setSku(d.product.sku ?? "")
      setQrCode(d.product.qrCode ?? "")
      setImageUrl(d.product.imageUrl ?? "")
      setIsActive(d.product.isActive)
      setIsComposite(d.product.isComposite)
      setTrackInventory(d.product.trackInventory)
      setAvailabilityMode(
        d.product.availabilityMode === "selected_locations_only" ? "selected_locations_only" : "all_locations",
      )
      setSelectedLocationIds(d.locationIds)
      setIngredients(
        d.ingredients.length ? d.ingredients : [{ inventoryItemId: inventory[0]?.id ?? "", quantity: "1" }],
      )
    })()
    return () => {
      cancelled = true
    }
  }, [launch, businessSlug, inventory, resetDefaults])

  const costByInvId = useMemo(() => {
    const m = new Map<string, bigint>()
    for (const i of inventory) {
      m.set(i.id, BigInt(i.costMinor))
    }
    return m
  }, [inventory])

  const compositePreviewMinor = useMemo(() => {
    if (!isComposite) return BigInt(0)
    let t = BigInt(0)
    for (const line of ingredients) {
      if (!line.inventoryItemId) continue
      const c = costByInvId.get(line.inventoryItemId)
      if (c == null) continue
      try {
        const milli = parseDecimal3ToMilli(line.quantity)
        t += ingredientLineCostMinor(c, milli)
      } catch {
        /* skip */
      }
    }
    return t
  }, [costByInvId, ingredients, isComposite])

  const toggleLocation = (id: string, checked: boolean) => {
    setSelectedLocationIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const submit = async () => {
    if (!launch) return
    setBusy(true)
    setFormError(null)
    try {
      await flushPendingImageUploads((_id, url) => {
        setImageUrl(url)
      })
      if (launch.mode === "edit") {
        await updateProduct(businessSlug, {
          id: launch.productId,
          name,
          description: description || null,
          categoryId,
          sku: sku || null,
          qrCode: qrCode || null,
          imageUrl: imageUrl.trim() === "" ? undefined : imageUrl.trim(),
          isActive,
          isComposite,
          trackInventory,
          availabilityMode,
          locationIds: availabilityMode === "selected_locations_only" ? selectedLocationIds : [],
          ingredients:
            isComposite ? ingredients.filter((x) => x.inventoryItemId).map((x) => ({ ...x })) : [],
        })
      } else {
        await createProduct(businessSlug, {
          name,
          description: description || null,
          categoryId,
          sku: sku || null,
          qrCode: qrCode || null,
          imageUrl: imageUrl.trim() === "" ? undefined : imageUrl.trim(),
          isActive,
          isComposite,
          trackInventory,
          availabilityMode,
          locationIds: availabilityMode === "selected_locations_only" ? selectedLocationIds : [],
          prices: [],
          ingredients: [],
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {editingId
              ? "Ingredient quantities use three decimal places. Manage variant prices from the Prices column badge."
              : "Save the basics first. Use the Prices column badge for tiers, and Edit for composite ingredients."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <CatalogProductsRootError message={loadError ?? formError ?? undefined} />
          {detailLoading && launch?.mode === "edit" ? (
            <p className="text-muted-foreground text-sm">Loading product…</p>
          ) : null}
          <fieldset disabled={detailLoading} className="grid min-w-0 gap-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
          <Field>
            <FieldLabel>Category</FieldLabel>
            <Select value={categoryId || undefined} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category">
                  {categories.find((c) => c.id === categoryId)?.name ?? null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Product image (optional)</FieldLabel>
            <ProductImageUpload value={imageUrl} onChange={setImageUrl} />
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… or /uploads/… after upload"
              autoComplete="off"
              className="mt-2"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Upload a file above, or paste a public https link. Local dev uploads use paths under /uploads/.
            </p>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>SKU (optional)</FieldLabel>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>QR code payload (optional)</FieldLabel>
              <Input
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="e.g. product id or URL your labels encode"
                autoComplete="off"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                POS will match whatever string a customer QR scan decodes to (often a short id or deep link).
              </p>
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isComposite} onCheckedChange={(v) => setIsComposite(v === true)} />
              Composite
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={trackInventory} onCheckedChange={(v) => setTrackInventory(v === true)} />
              Track inventory
            </label>
          </div>
          <Field>
            <FieldLabel>Availability</FieldLabel>
            <Select
              value={availabilityMode}
              onValueChange={(v) => setAvailabilityMode((v ?? "all_locations") as typeof availabilityMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Availability">
                  {availabilityMode === "all_locations" ? "All branches" : "Selected branches only"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_locations">All branches</SelectItem>
                <SelectItem value="selected_locations_only">Selected branches only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {availabilityMode === "selected_locations_only" ? (
            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-sm font-medium">Branches</p>
              {locations.map((loc) => (
                <label key={loc.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedLocationIds.includes(loc.id)}
                    onCheckedChange={(v) => toggleLocation(loc.id, v === true)}
                  />
                  {loc.name}
                </label>
              ))}
            </div>
          ) : null}
          {editingId && isComposite ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FieldLabel>Ingredients</FieldLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setIngredients((rows) => [...rows, { inventoryItemId: inventory[0]?.id ?? "", quantity: "1" }])
                  }
                >
                  Add line
                </Button>
              </div>
              {ingredients.map((line, idx) => {
                const inv = inventory.find((i) => i.id === line.inventoryItemId)
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <Select
                      value={line.inventoryItemId || undefined}
                      onValueChange={(v) =>
                        setIngredients((rows) =>
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
                        setIngredients((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)),
                        )
                      }
                      placeholder="Qty (3 dp)"
                    />
                  </div>
                )
              })}
              <p className="text-muted-foreground text-sm">
                Rolled-up cost (estimate):{" "}
                <span className="text-foreground font-medium">{formatMinorToDecimal2(compositePreviewMinor)}</span>
              </p>
            </div>
          ) : null}
          </fieldset>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || categories.length === 0 || !!loadError || detailLoading}
            onClick={submit}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
