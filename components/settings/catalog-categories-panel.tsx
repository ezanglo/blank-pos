"use client"

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  GripVerticalIcon,
  Layers2Icon,
  PencilIcon,
  PlusIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  createCategoryVariant,
  deleteCategoryVariant,
  updateCategoryVariant,
} from "@/lib/actions/catalog-category-variants"
import {
  createProductCategory,
  deleteProductCategory,
  reorderProductCategories,
  updateProductCategory,
} from "@/lib/actions/catalog-categories"
import type { ProductCategoryRow, ProductCategoryVariantRow } from "@/lib/db/schema-catalog"

function sortCategories(rows: ProductCategoryRow[]) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

function StaticCategoryRow({ row }: { row: Row<ProductCategoryRow> }) {
  return (
    <TableRow>
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={
            cell.column.id === "drag"
              ? "w-10"
              : cell.column.id === "sortOrder"
                ? "w-px whitespace-nowrap px-1 py-2 text-right align-middle"
                : undefined
          }
        >
          {cell.column.id === "drag" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-7 opacity-40"
              disabled
            >
              <GripVerticalIcon className="size-3" />
              <span className="sr-only">Clear search to reorder</span>
            </Button>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}

function DraggableCategoryRow({ row }: { row: Row<ProductCategoryRow> }) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      ref={setNodeRef}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={
            cell.column.id === "drag"
              ? "w-10"
              : cell.column.id === "sortOrder"
                ? "w-px whitespace-nowrap px-1 py-2 text-right align-middle"
                : undefined
          }
        >
          {cell.column.id === "drag" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-transparent size-7"
              {...attributes}
              {...listeners}
            >
              <GripVerticalIcon className="size-3" />
              <span className="sr-only">Drag to reorder</span>
            </Button>
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function CatalogCategoriesPanel({
  businessSlug,
  categories,
  categoryVariants,
}: {
  businessSlug: string
  categories: ProductCategoryRow[]
  categoryVariants: ProductCategoryVariantRow[]
}) {
  const router = useRouter()
  const categoriesRef = useRef(categories)
  categoriesRef.current = categories

  const [ordered, setOrdered] = useState<ProductCategoryRow[]>(() => sortCategories(categories))
  const orderedRef = useRef(ordered)
  orderedRef.current = ordered

  useEffect(() => {
    setOrdered(sortCategories(categories))
  }, [categories])

  const [query, setQuery] = useState("")
  const searching = query.trim().length > 0

  const variantCountByCategoryId = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of categoryVariants) {
      m.set(v.categoryId, (m.get(v.categoryId) ?? 0) + 1)
    }
    return m
  }, [categoryVariants])

  const variantLabelsSearchByCategoryId = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of categoryVariants) {
      const cur = m.get(v.categoryId) ?? ""
      m.set(v.categoryId, `${cur} ${v.label}`)
    }
    return m
  }, [categoryVariants])

  const displayData = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ordered
    return ordered.filter((row) => {
      const blob = `${row.sortOrder} ${row.name} ${row.icon ?? ""} ${variantLabelsSearchByCategoryId.get(row.id) ?? ""}`
      return blob.toLowerCase().includes(q)
    })
  }, [ordered, query, variantLabelsSearchByCategoryId])

  const sortableId = useMemo(() => `category-dnd-${businessSlug}`, [businessSlug])
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  )

  const dataIds = useMemo<UniqueIdentifier[]>(() => ordered.map((c) => c.id), [ordered])

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    sortOrder: false,
  })

  const columns = useMemo<ColumnDef<ProductCategoryRow>[]>(
    () => [
      {
        id: "drag",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "sortOrder",
        id: "sortOrder",
        header: () => (
          <>
            <span className="sr-only">Sort order</span>
            <span className="text-muted-foreground text-xs font-medium tabular-nums" aria-hidden>
              #
            </span>
          </>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right text-xs tabular-nums">
            {row.original.sortOrder}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.color ? (
              <span
                className="size-2.5 shrink-0 rounded-full border"
                style={{ backgroundColor: row.original.color }}
                aria-hidden
              />
            ) : null}
            <span>{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "variants",
        header: "Variants",
        accessorFn: (row) => variantCountByCategoryId.get(row.id) ?? 0,
        cell: ({ row }) => {
          const n = variantCountByCategoryId.get(row.original.id) ?? 0
          const label = n === 1 ? "1 variant" : `${n} variants`
          return (
            <Button
              type="button"
              variant="ghost"
              className="h-auto gap-0 px-1 font-normal hover:bg-muted/80"
              onClick={() => {
                setVariantError(null)
                setVariantsView("list")
                setVariantEdit(null)
                setNewVariantLabel("")
                setNewVariantSort("0")
                setVariantsCategory(row.original)
              }}
              aria-label={`${row.original.name}: ${label}`}
            >
              <Badge variant="outline" className="text-muted-foreground gap-1 font-normal">
                <Layers2Icon className="size-3 shrink-0" />
                {label}
              </Badge>
            </Button>
          )
        },
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Edit"
              onClick={() => {
                resetForm(row.original)
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
    [variantCountByCategoryId],
  )

  const table = useReactTable({
    data: displayData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  })

  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<ProductCategoryRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<ProductCategoryRow | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState("")
  const [icon, setIcon] = useState("")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [variantsCategory, setVariantsCategory] = useState<ProductCategoryRow | null>(null)
  const [variantsView, setVariantsView] = useState<"list" | "edit">("list")
  const [variantEdit, setVariantEdit] = useState<ProductCategoryVariantRow | null>(null)
  const [newVariantLabel, setNewVariantLabel] = useState("")
  const [newVariantSort, setNewVariantSort] = useState("0")
  const [vEditLabel, setVEditLabel] = useState("")
  const [vEditSort, setVEditSort] = useState("0")
  const [variantBusy, setVariantBusy] = useState(false)
  const [variantError, setVariantError] = useState<string | null>(null)

  const variantsForOpenCategory = useMemo(() => {
    if (!variantsCategory) return []
    return categoryVariants
      .filter((v) => v.categoryId === variantsCategory.id)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
  }, [categoryVariants, variantsCategory])

  const resetForm = (row?: ProductCategoryRow | null) => {
    setFormError(null)
    if (row) {
      setName(row.name)
      setColor(row.color ?? "")
      setIcon(row.icon ?? "")
    } else {
      setName("")
      setColor("")
      setIcon("")
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (searching) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const prev = orderedRef.current
    const oldIndex = prev.findIndex((c) => c.id === String(active.id))
    const newIndex = prev.findIndex((c) => c.id === String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(prev, oldIndex, newIndex)
    setOrdered(next)

    void (async () => {
      try {
        await reorderProductCategories(businessSlug, { orderedIds: next.map((c) => c.id) })
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save category order.")
        setOrdered(sortCategories(categoriesRef.current))
      }
    })()
  }

  async function submitCreate() {
    setBusy(true)
    setFormError(null)
    try {
      const maxOrder = orderedRef.current.reduce((m, c) => Math.max(m, c.sortOrder), -1)
      await createProductCategory(businessSlug, {
        name,
        color: color || null,
        icon: icon || null,
        sortOrder: maxOrder + 1,
      })
      setAddOpen(false)
      resetForm()
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
      await updateProductCategory(businessSlug, {
        id: editRow.id,
        name,
        color: color || null,
        icon: icon || null,
        sortOrder: editRow.sortOrder,
      })
      setEditRow(null)
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
      await deleteProductCategory(businessSlug, deleteRow.id)
      setDeleteRow(null)
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  const rows = table.getRowModel().rows

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Group catalog items for filters and reporting. Products require a category. Drag rows to set order.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
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
                  .map((column) => {
                    const label =
                      column.id === "sortOrder"
                        ? "Order"
                        : column.id === "name"
                          ? "Name"
                          : column.id === "variants"
                            ? "Variants"
                            : column.id
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              onClick={() => {
                resetForm()
                setAddOpen(true)
              }}
            >
              <PlusIcon className="size-4" />
              Add category
            </Button>
          </div>
        </div>
        {searching ? (
          <p className="text-muted-foreground text-sm">Clear search to drag and reorder categories.</p>
        ) : null}
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            id={sortableId}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={
                          header.column.id === "drag"
                            ? "w-10"
                            : header.column.id === "sortOrder"
                              ? "w-px whitespace-nowrap px-1 text-right"
                              : undefined
                        }
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.length ? (
                  searching ? (
                    rows.map((row) => <StaticCategoryRow key={row.id} row={row} />)
                  ) : (
                    <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                      {rows.map((row) => (
                        <DraggableCategoryRow key={row.id} row={row} />
                      ))}
                    </SortableContext>
                  )
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
          </DndContext>
        </div>
        <p className="text-muted-foreground text-sm">
          {displayData.length === 0
            ? "0 categories"
            : searching
              ? `${displayData.length} match${displayData.length === 1 ? "" : "es"}`
              : `${displayData.length} categor${displayData.length === 1 ? "y" : "ies"}`}
        </p>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>Optional color and icon for POS filters later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <RootFormError message={formError ?? undefined} />
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Color (optional)</FieldLabel>
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3b82f6" />
              </Field>
              <Field>
                <FieldLabel>Icon (optional)</FieldLabel>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="lucide name" />
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
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <RootFormError message={formError ?? undefined} />
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Color</FieldLabel>
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Icon</FieldLabel>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={submitEdit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
            <DialogDescription>
              {deleteRow ? `Delete “${deleteRow.name}”? This cannot be undone.` : null}
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

      <Dialog
        open={!!variantsCategory}
        onOpenChange={(o) => {
          if (!o) {
            setVariantsCategory(null)
            setVariantsView("list")
            setVariantEdit(null)
            setVariantError(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {variantsView === "edit" ? "Edit variant" : `Variants · ${variantsCategory?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              Preset labels for variant prices (e.g. Small / Medium / Large). Sort order controls ordering in the
              catalog and POS.
            </DialogDescription>
          </DialogHeader>

          {variantsView === "edit" && variantEdit && variantsCategory ? (
            <div className="grid gap-4">
              <RootFormError message={variantError ?? undefined} />
              <Field>
                <FieldLabel>Label</FieldLabel>
                <Input value={vEditLabel} onChange={(e) => setVEditLabel(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Sort order</FieldLabel>
                <Input value={vEditSort} onChange={(e) => setVEditSort(e.target.value)} inputMode="numeric" />
              </Field>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setVariantsView("list")
                    setVariantEdit(null)
                    setVariantError(null)
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={variantBusy}
                  onClick={async () => {
                    setVariantBusy(true)
                    setVariantError(null)
                    try {
                      await updateCategoryVariant(businessSlug, {
                        id: variantEdit.id,
                        categoryId: variantsCategory.id,
                        label: vEditLabel,
                        sortOrder: Number(vEditSort) || 0,
                      })
                      setVariantsView("list")
                      setVariantEdit(null)
                      router.refresh()
                    } catch (e) {
                      setVariantError(e instanceof Error ? e.message : "Something went wrong.")
                    } finally {
                      setVariantBusy(false)
                    }
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="grid gap-4">
              <RootFormError message={variantError ?? undefined} />
              <div className="space-y-2 rounded-xl border">
                {variantsForOpenCategory.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-sm">No variants yet.</p>
                ) : (
                  <ul className="divide-y">
                    {variantsForOpenCategory.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{v.label}</p>
                          <p className="text-muted-foreground text-xs">Order {v.sortOrder}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Edit variant"
                            onClick={() => {
                              setVariantEdit(v)
                              setVEditLabel(v.label)
                              setVEditSort(String(v.sortOrder))
                              setVariantsView("edit")
                              setVariantError(null)
                            }}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Delete variant"
                            onClick={async () => {
                              if (!variantsCategory) return
                              setVariantBusy(true)
                              setVariantError(null)
                              try {
                                await deleteCategoryVariant(businessSlug, variantsCategory.id, v.id)
                                router.refresh()
                              } catch (e) {
                                setVariantError(e instanceof Error ? e.message : "Something went wrong.")
                              } finally {
                                setVariantBusy(false)
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
                <p className="mb-2 text-sm font-medium">Add variant</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Label</FieldLabel>
                    <Input
                      value={newVariantLabel}
                      onChange={(e) => setNewVariantLabel(e.target.value)}
                      placeholder="Small"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Sort order</FieldLabel>
                    <Input
                      value={newVariantSort}
                      onChange={(e) => setNewVariantSort(e.target.value)}
                      inputMode="numeric"
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  className="mt-3"
                  variant="secondary"
                  disabled={variantBusy || !variantsCategory}
                  onClick={async () => {
                    if (!variantsCategory) return
                    setVariantBusy(true)
                    setVariantError(null)
                    try {
                      await createCategoryVariant(businessSlug, {
                        categoryId: variantsCategory.id,
                        label: newVariantLabel,
                        sortOrder: Number(newVariantSort) || 0,
                      })
                      setNewVariantLabel("")
                      setNewVariantSort("0")
                      router.refresh()
                    } catch (e) {
                      setVariantError(e instanceof Error ? e.message : "Something went wrong.")
                    } finally {
                      setVariantBusy(false)
                    }
                  }}
                >
                  Add variant
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVariantsCategory(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
