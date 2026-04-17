"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table"
import { ChevronDownIcon, PencilIcon, PlusIcon, TableIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createProductPrice,
  deleteProductPrice,
  updateProductPrice,
} from "@/lib/actions/catalog-product-prices"
import {
  createProduct,
  deleteProduct,
  getProductDetailForEdit,
  updateProduct,
  type ProductDetailDTO,
} from "@/lib/actions/catalog-products"
import {
  formatMinorToDecimal2,
  ingredientLineCostMinor,
  parseDecimal3ToMilli,
} from "@/lib/money"
import type { ProductCategoryRow, ProductCategoryVariantRow } from "@/lib/db/schema-catalog"
import type { ProductListRow } from "@/lib/queries/catalog"

type Loc = { id: string; name: string }
type InvPick = { id: string; name: string; unit: string; costMinor: string }

type IngRow = { inventoryItemId: string; quantity: string }

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

function formatLocationCell(r: ProductListRow): string {
  if (r.product.availabilityMode !== "selected_locations_only") return "All branches"
  if (r.locationNames.length === 0) return "No branches selected"
  return r.locationNames.join(", ")
}

export function CatalogProductsPanel({
  businessSlug,
  products,
  categories,
  categoryVariants,
  locations,
  inventory,
}: {
  businessSlug: string
  products: ProductListRow[]
  categories: ProductCategoryRow[]
  categoryVariants: ProductCategoryVariantRow[]
  locations: Loc[]
  inventory: InvPick[]
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isComposite, setIsComposite] = useState(false)
  const [trackInventory, setTrackInventory] = useState(false)
  const [availabilityMode, setAvailabilityMode] = useState<"all_locations" | "selected_locations_only">(
    "all_locations",
  )
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const [ingredients, setIngredients] = useState<IngRow[]>([{ inventoryItemId: "", quantity: "1" }])

  const [pricesRow, setPricesRow] = useState<ProductListRow | null>(null)
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

  const resetForm = useCallback(() => {
    setFormError(null)
    setEditingId(null)
    setName("")
    setDescription("")
    setCategoryId(categories[0]?.id ?? "")
    setSku("")
    setBarcode("")
    setIsActive(true)
    setIsComposite(false)
    setTrackInventory(false)
    setAvailabilityMode("all_locations")
    setSelectedLocationIds([])
    setIngredients([{ inventoryItemId: inventory[0]?.id ?? "", quantity: "1" }])
  }, [categories, inventory])

  const loadDetail = useCallback(
    async (id: string) => {
      setFormError(null)
      const d: ProductDetailDTO | null = await getProductDetailForEdit(businessSlug, id)
      if (!d) {
        setFormError("Product not found.")
        return
      }
      setEditingId(id)
      setName(d.product.name)
      setDescription(d.product.description ?? "")
      setCategoryId(d.product.categoryId)
      setSku(d.product.sku ?? "")
      setBarcode(d.product.barcode ?? "")
      setIsActive(d.product.isActive)
      setIsComposite(d.product.isComposite)
      setTrackInventory(d.product.trackInventory)
      setAvailabilityMode(
        d.product.availabilityMode === "selected_locations_only" ? "selected_locations_only" : "all_locations",
      )
      setSelectedLocationIds(d.locationIds)
      setIngredients(
        d.ingredients.length
          ? d.ingredients
          : [{ inventoryItemId: inventory[0]?.id ?? "", quantity: "1" }],
      )
      setFormOpen(true)
    },
    [businessSlug, inventory],
  )

  const openCreate = () => {
    setFormError(null)
    resetForm()
    setFormOpen(true)
  }

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

  const openPricesManager = useCallback(
    async (row: ProductListRow) => {
      setPriceDialogError(null)
      resetPriceDialogForms()
      setPricesRow(row)
      setPricesDetail(null)
      setPricesLoading(true)
      try {
        const d = await getProductDetailForEdit(businessSlug, row.product.id)
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
        setPriceDialogError(e instanceof Error ? e.message : "Something went wrong.")
      } finally {
        setPricesLoading(false)
      }
    },
    [businessSlug, categoryVariants, resetPriceDialogForms],
  )

  const reloadPricesDetail = useCallback(async () => {
    if (!pricesRow) return
    const d = await getProductDetailForEdit(businessSlug, pricesRow.product.id)
    if (d) setPricesDetail(d)
  }, [businessSlug, pricesRow])

  const toggleLocation = (id: string, checked: boolean) => {
    setSelectedLocationIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const submit = async () => {
    setBusy(true)
    setFormError(null)
    try {
      if (editingId) {
        await updateProduct(businessSlug, {
          id: editingId,
          name,
          description: description || null,
          categoryId,
          sku: sku || null,
          barcode: barcode || null,
          isActive,
          isComposite,
          trackInventory,
          availabilityMode,
          locationIds: availabilityMode === "selected_locations_only" ? selectedLocationIds : [],
          ingredients:
            isComposite
              ? ingredients.filter((x) => x.inventoryItemId).map((x) => ({ ...x }))
              : [],
        })
      } else {
        await createProduct(businessSlug, {
          name,
          description: description || null,
          categoryId,
          sku: sku || null,
          barcode: barcode || null,
          isActive,
          isComposite,
          trackInventory,
          availabilityMode,
          locationIds: availabilityMode === "selected_locations_only" ? selectedLocationIds : [],
          prices: [],
          ingredients: [],
        })
      }
      setFormOpen(false)
      resetForm()
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  const submitDelete = async () => {
    if (!deleteId) return
    setBusy(true)
    setFormError(null)
    try {
      await deleteProduct(businessSlug, deleteId)
      setDeleteId(null)
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  const [query, setQuery] = useState("")
  const [categoryFilterId, setCategoryFilterId] = useState("")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const categoriesSorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  )

  useEffect(() => {
    if (categoryFilterId && !categories.some((c) => c.id === categoryFilterId)) {
      setCategoryFilterId("")
    }
  }, [categories, categoryFilterId])

  const categoryFilterLabel = useMemo(() => {
    if (!categoryFilterId) return "All categories"
    const c = categoriesSorted.find((x) => x.id === categoryFilterId)
    return c?.name ?? "All categories"
  }, [categoryFilterId, categoriesSorted])

  const displayProducts = useMemo(() => {
    let list = products
    if (categoryFilterId) {
      list = list.filter((r) => r.product.categoryId === categoryFilterId)
    }
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) =>
      `${r.product.name} ${r.product.sku ?? ""} ${r.priceCount} ${r.categoryName} ${formatLocationCell(r)} ${r.firstIngredientPreview ?? ""} ${r.ingredientCount} ${r.product.trackInventory ? "track" : ""}`
        .toLowerCase()
        .includes(q),
    )
  }, [products, query, categoryFilterId])

  const columns = useMemo<ColumnDef<ProductListRow>[]>(
    () => [
      {
        id: "name",
        header: "Product",
        accessorFn: (r) => r.product.name,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2">
            <span>{row.original.product.name}</span>
            {row.original.product.isComposite ? (
              <span className="text-muted-foreground text-xs">Composite</span>
            ) : null}
            {!row.original.product.isActive ? (
              <span className="text-muted-foreground text-xs">Inactive</span>
            ) : null}
          </span>
        ),
      },
      {
        id: "category",
        header: "Category",
        accessorFn: (r) => r.categoryName,
        enableSorting: false,
        cell: ({ row }) => row.original.categoryName,
      },
      {
        id: "prices",
        header: "Prices",
        accessorFn: (r) => r.priceCount,
        enableSorting: false,
        cell: ({ row }) => {
          const n = row.original.priceCount
          return (
            <Badge
              variant="secondary"
              className="cursor-pointer border-transparent bg-emerald-600 text-white hover:bg-emerald-700"
              render={<button type="button" />}
              onClick={() => void openPricesManager(row.original)}
              aria-label={`Open variant prices, ${n} prices`}
            >
              {n} prices
            </Badge>
          )
        },
      },
      {
        id: "location",
        header: "Location",
        accessorFn: (r) => formatLocationCell(r),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="max-w-56 truncate text-sm" title={formatLocationCell(row.original)}>
            {formatLocationCell(row.original)}
          </span>
        ),
      },
      {
        id: "ingredients",
        header: "Ingredients",
        accessorFn: (r) =>
          r.product.isComposite ? `${r.firstIngredientPreview ?? ""} ${r.ingredientCount}`.trim() : "",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original
          if (!r.product.isComposite) {
            return <span className="text-muted-foreground text-sm">—</span>
          }
          if (r.ingredientCount === 0) {
            return <span className="text-muted-foreground text-sm">0</span>
          }
          const rest = r.ingredientCount > 1 ? ` · ${r.ingredientCount} lines` : ""
          const full = `${r.firstIngredientPreview ?? ""}${rest}`
          return (
            <span className="text-muted-foreground max-w-[18rem] truncate text-sm" title={full}>
              {r.firstIngredientPreview}
              {r.ingredientCount > 1 ? (
                <span className="text-muted-foreground/90">{` · ${r.ingredientCount} lines`}</span>
              ) : null}
            </span>
          )
        },
      },
      {
        id: "trackInventory",
        header: "Track inventory",
        accessorFn: (r) => (r.product.trackInventory ? "Yes" : "No"),
        enableSorting: false,
        cell: ({ row }) => (row.original.product.trackInventory ? "Yes" : "No"),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Edit"
              onClick={() => void loadDetail(row.original.product.id)}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Delete"
              onClick={() => setDeleteId(row.original.product.id)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [loadDetail, openPricesManager],
  )

  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.product.id,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  })

  const rows = table.getRowModel().rows

  const productColumnMenuLabel = (columnId: string) => {
    switch (columnId) {
      case "name":
        return "Product"
      case "category":
        return "Category"
      case "prices":
        return "Prices"
      case "location":
        return "Location"
      case "ingredients":
        return "Ingredients"
      case "trackInventory":
        return "Track inventory"
      default:
        return columnId
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add a product with category and availability. Use the green prices badge for variant tiers, and edit for
          composite ingredients.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="border-border bg-muted/40 rounded-xl border px-4 py-3 text-sm">
          Create at least one <strong>category</strong> before adding products.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
            <Input
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
              className="min-w-0 max-w-sm flex-1"
            />
            {categories.length > 0 ? (
              <Select
                value={categoryFilterId || "__all__"}
                onValueChange={(v) => setCategoryFilterId(!v || v === "__all__" ? "" : v)}
              >
                <SelectTrigger
                  size="default"
                  className="h-9 max-w-56 min-w-36 shrink-0"
                  aria-label="Filter by category"
                >
                  <SelectValue>{categoryFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {categoriesSorted.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" variant="outline" size="sm" className="gap-1.5" />}
              >
                <TableIcon className="size-4" />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <ChevronDownIcon className="size-4 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {table
                  .getAllColumns()
                  .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {productColumnMenuLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" onClick={openCreate}>
              <PlusIcon className="size-4" />
              Add product
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground text-sm">
          {displayProducts.length === 0
            ? "0 products"
            : query.trim()
              ? `${displayProducts.length} match${displayProducts.length === 1 ? "" : "es"}`
              : `${displayProducts.length} product${displayProducts.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setFormOpen(false)
            resetForm()
          }
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
            <RootFormError message={formError ?? undefined} />
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
              <Select
                value={categoryId || undefined}
                onValueChange={(v) => setCategoryId(v ?? "")}
              >
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>SKU (optional)</FieldLabel>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Barcode (optional)</FieldLabel>
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
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
                onValueChange={(v) =>
                  setAvailabilityMode((v ?? "all_locations") as typeof availabilityMode)
                }
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
                      setIngredients((rows) => [
                        ...rows,
                        { inventoryItemId: inventory[0]?.id ?? "", quantity: "1" },
                      ])
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
                        <SelectValue placeholder="Item">
                          {inv ? `${inv.name} (${inv.unit})` : null}
                        </SelectValue>
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
                  Rolled-up cost (estimate): <span className="text-foreground font-medium">{formatMinorToDecimal2(compositePreviewMinor)}</span>
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy || categories.length === 0} onClick={submit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product</DialogTitle>
            <DialogDescription>This removes the product and its prices from the catalog.</DialogDescription>
          </DialogHeader>
          <RootFormError message={formError ?? undefined} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={submitDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pricesRow}
        onOpenChange={(o) => {
          if (!o) {
            setPricesRow(null)
            setPricesDetail(null)
            resetPriceDialogForms()
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pricesView === "edit" && priceEditRow
                ? "Edit variant price"
                : `Variants · ${pricesRow?.product.name ?? ""}`}
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
              <RootFormError message={priceDialogError ?? undefined} />
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
              <RootFormError message={priceDialogError ?? undefined} />
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
                  disabled={
                    priceBusy ||
                    !pricesDetail ||
                    !newVariantId ||
                    variantsForPricesDialog.length === 0
                  }
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
                        const used = new Set(
                          next.prices.map((x) => x.categoryVariantId).filter(Boolean) as string[],
                        )
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPricesRow(null)
                    setPricesDetail(null)
                    resetPriceDialogForms()
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <RootFormError message={priceDialogError ?? undefined} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
