"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react"

import {
  mergeCatalogProductsUrlState,
  parseCatalogProductsUrlState,
  serializeCatalogProductsUrlState,
  type CatalogProductsUrlState,
} from "@/lib/catalog-products-url"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
  updateInventoryStockQuantity,
} from "@/lib/actions/catalog-inventory"
import { formatMinorToDecimal2 } from "@/lib/money"
import type { InventoryItemWithStock } from "@/lib/queries/catalog"
import { cn } from "@/lib/utils"

type Row = InventoryItemWithStock

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function CatalogInventoryPanel({
  businessSlug,
  rows,
  total,
}: {
  businessSlug: string
  rows: Row[]
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlState = useMemo(
    () => parseCatalogProductsUrlState(Object.fromEntries(searchParams.entries())),
    [searchParams],
  )

  const pushUrlState = useCallback(
    (patch: Partial<CatalogProductsUrlState>) => {
      const next = mergeCatalogProductsUrlState(urlState, patch)
      const qs = serializeCatalogProductsUrlState(next)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, urlState],
  )

  const [searchDraft, setSearchDraft] = useState(urlState.search)
  useEffect(() => {
    setSearchDraft(urlState.search)
  }, [urlState.search])

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft === urlState.search) return
      pushUrlState({ search: searchDraft })
    }, 350)
    return () => clearTimeout(t)
  }, [searchDraft, urlState.search, pushUrlState])

  const totalPages = Math.max(1, Math.ceil(total / urlState.pageSize))
  const hasPrevPage = urlState.page > 1
  const hasNextPage = urlState.page < totalPages
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [stockRow, setStockRow] = useState<Row | null>(null)
  const [deleteRow, setDeleteRow] = useState<Row | null>(null)
  const [name, setName] = useState("")
  const [unit, setUnit] = useState("")
  const [cost, setCost] = useState("")
  const [reorder, setReorder] = useState("")
  const [initialStock, setInitialStock] = useState("0")
  const [stockQty, setStockQty] = useState("0")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const resetItem = (r?: Row | null) => {
    setFormError(null)
    if (r) {
      setName(r.item.name)
      setUnit(r.item.unit)
      setCost(formatMinorToDecimal2(r.item.costPerUnitMinor))
      setReorder(r.item.reorderPoint != null ? String(r.item.reorderPoint) : "")
    } else {
      setName("")
      setUnit("")
      setCost("")
      setReorder("")
      setInitialStock("0")
    }
  }

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (r) => r.item.name,
        enableSorting: false,
        cell: ({ row }) => row.original.item.name,
      },
      {
        id: "unit",
        header: "Unit",
        accessorFn: (r) => r.item.unit,
        enableSorting: false,
        cell: ({ row }) => row.original.item.unit,
      },
      {
        id: "cost",
        header: "Cost / unit",
        accessorFn: (r) => formatMinorToDecimal2(r.item.costPerUnitMinor),
        enableSorting: false,
        cell: ({ row }) => formatMinorToDecimal2(row.original.item.costPerUnitMinor),
      },
      {
        id: "stock",
        header: "Stock",
        accessorFn: (r) => String(r.stock),
        enableSorting: false,
        cell: ({ row }) => row.original.stock,
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
              aria-label="Adjust stock"
              onClick={() => {
                setStockQty(String(row.original.stock))
                setStockRow(row.original)
              }}
            >
              <PackageIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Edit"
              onClick={() => {
                resetItem(row.original)
                setEditRow(row.original)
              }}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Delete"
              onClick={() => setDeleteRow(row.original)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.item.id,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  })

  const tableRows = table.getRowModel().rows

  const inventoryColumnMenuLabel = (columnId: string) => {
    switch (columnId) {
      case "name":
        return "Name"
      case "unit":
        return "Unit"
      case "cost":
        return "Cost / unit"
      case "stock":
        return "Stock"
      default:
        return columnId
    }
  }

  async function submitCreate() {
    setBusy(true)
    setFormError(null)
    try {
      await createInventoryItem(businessSlug, {
        name,
        unit,
        costAmount: cost,
        reorderPoint: reorder === "" ? null : Number(reorder),
        initialStock: Number(initialStock) || 0,
      })
      setAddOpen(false)
      resetItem()
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function submitEdit() {
    if (!editRow) return
    setBusy(true)
    setFormError(null)
    try {
      await updateInventoryItem(businessSlug, {
        id: editRow.item.id,
        name,
        unit,
        costAmount: cost,
        reorderPoint: reorder === "" ? null : Number(reorder),
      })
      setEditRow(null)
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function submitStock() {
    if (!stockRow) return
    setBusy(true)
    setFormError(null)
    try {
      await updateInventoryStockQuantity(businessSlug, {
        inventoryItemId: stockRow.item.id,
        quantity: Number(stockQty) || 0,
      })
      setStockRow(null)
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function submitDelete() {
    if (!deleteRow) return
    setBusy(true)
    setFormError(null)
    try {
      await deleteInventoryItem(businessSlug, deleteRow.item.id)
      setDeleteRow(null)
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Raw materials and stock levels (organization-wide). Used for composite recipes. Search and pagination match
          the products catalog (URL query params).
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
            <Input
              placeholder="Search items…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              aria-label="Search inventory"
              className="min-w-0 max-w-sm flex-1"
            />
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
                      {inventoryColumnMenuLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href={`/${businessSlug}/catalog/inventory/movements`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Movement log
            </Link>
            <Button
              type="button"
              onClick={() => {
                resetItem()
                setAddOpen(true)
              }}
            >
              <PlusIcon className="size-4" />
              Add item
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
              {tableRows.length ? (
                tableRows.map((row) => (
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
        <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            {total === 0
              ? "0 items"
              : (() => {
                  const from = (urlState.page - 1) * urlState.pageSize + 1
                  const to = (urlState.page - 1) * urlState.pageSize + rows.length
                  return `Showing ${from}–${to} of ${total} item${total === 1 ? "" : "s"}`
                })()}
          </p>
          {total > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPrevPage}
                onClick={() => hasPrevPage && pushUrlState({ page: urlState.page - 1 })}
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="text-foreground min-w-28 text-center text-xs tabular-nums">
                Page {urlState.page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => hasNextPage && pushUrlState({ page: urlState.page + 1 })}
                aria-label="Next page"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add inventory item</DialogTitle>
            <DialogDescription>Cost uses two decimal places (minor units stored as integers).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <RootFormError message={formError ?? undefined} />
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <Field>
              <FieldLabel>Unit</FieldLabel>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, pcs, L" />
            </Field>
            <Field>
              <FieldLabel>Cost per unit</FieldLabel>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Reorder point (optional)</FieldLabel>
                <Input value={reorder} onChange={(e) => setReorder(e.target.value)} inputMode="numeric" />
              </Field>
              <Field>
                <FieldLabel>Initial stock</FieldLabel>
                <Input value={initialStock} onChange={(e) => setInitialStock(e.target.value)} inputMode="numeric" />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={submitCreate}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <RootFormError message={formError ?? undefined} />
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Unit</FieldLabel>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Cost per unit</FieldLabel>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Reorder point</FieldLabel>
              <Input value={reorder} onChange={(e) => setReorder(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={submitEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockRow} onOpenChange={(o) => !o && setStockRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock quantity</DialogTitle>
            <DialogDescription>
              Organization-wide quantity for {stockRow?.item.name}. Changes write an adjustment entry to the{" "}
              <Link href={`/${businessSlug}/catalog/inventory/movements`} className="text-primary underline-offset-4 hover:underline">
                movement log
              </Link>
              .
            </DialogDescription>
          </DialogHeader>
          <RootFormError message={formError ?? undefined} />
          <Field>
            <FieldLabel>Quantity (whole units)</FieldLabel>
            <Input value={stockQty} onChange={(e) => setStockQty(e.target.value)} inputMode="numeric" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStockRow(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={submitStock}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item</DialogTitle>
            <DialogDescription>
              {deleteRow ? `Delete “${deleteRow.item.name}”?` : null}
            </DialogDescription>
          </DialogHeader>
          <RootFormError message={formError ?? undefined} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={submitDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
