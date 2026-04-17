"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"

import { AdminSettingsTable } from "@/components/admin/admin-settings-table"
import { Button } from "@/components/ui/button"
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
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
  updateInventoryStockQuantity,
} from "@/lib/actions/catalog-inventory"
import { formatMinorToDecimal2 } from "@/lib/money"
import type { InventoryItemWithStock } from "@/lib/queries/catalog"

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
}: {
  businessSlug: string
  rows: Row[]
}) {
  const router = useRouter()
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
        cell: ({ row }) => row.original.item.name,
      },
      {
        id: "unit",
        header: "Unit",
        accessorFn: (r) => r.item.unit,
        cell: ({ row }) => row.original.item.unit,
      },
      {
        id: "cost",
        header: "Cost / unit",
        cell: ({ row }) => formatMinorToDecimal2(row.original.item.costPerUnitMinor),
      },
      { id: "stock", header: "Stock", cell: ({ row }) => row.original.stock },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Stock"
              onClick={() => {
                setStockQty(String(row.original.stock))
                setStockRow(row.original)
              }}
            >
              Stock
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
          Raw materials and stock levels (organization-wide). Used for composite recipes.
        </p>
      </div>

      <AdminSettingsTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search items…"
        searchText={(r) => r.item.name}
        toolbarRight={
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
        }
      />

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
            <DialogDescription>Organization-wide quantity for {stockRow?.item.name}.</DialogDescription>
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
