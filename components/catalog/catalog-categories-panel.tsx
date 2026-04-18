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
  BoxesIcon,
  ChevronDownIcon,
  ClipboardListIcon,
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
import { createProductAddon, setCategoryAddonLinks, updateProductAddon } from "@/lib/actions/catalog-addons"
import {
  createCategoryInstruction,
  deleteCategoryInstruction,
  reorderCategoryInstructions,
  updateCategoryInstruction,
} from "@/lib/actions/catalog-category-instructions"
import {
  createCategoryVariant,
  deleteCategoryVariant,
  reorderCategoryVariants,
  updateCategoryVariant,
} from "@/lib/actions/catalog-category-variants"
import {
  createProductCategory,
  deleteProductCategory,
  reorderProductCategories,
  updateProductCategory,
} from "@/lib/actions/catalog-categories"
import type {
  ProductCategoryInstructionRow,
  ProductCategoryRow,
  ProductCategoryVariantRow,
} from "@/lib/db/schema-catalog"
import { formatMinorToDecimal2 } from "@/lib/money"
import type { CategoryAddonLinkJoined } from "@/lib/queries/catalog-addons"

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

function sortInstructionRows(rows: ProductCategoryInstructionRow[]) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
}

function sortVariantRows(rows: ProductCategoryVariantRow[]) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
}

function SortableVariantRow({
  variant,
  onEdit,
  onDelete,
  disabled,
}: {
  variant: ProductCategoryVariantRow
  onEdit: () => void
  onDelete: () => void
  disabled: boolean
}) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({
    id: variant.id,
  })

  return (
    <li
      ref={setNodeRef}
      data-dragging={isDragging}
      className="relative z-0 flex items-center justify-between gap-2 px-3 py-2 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-transparent size-8 shrink-0"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
          <span className="sr-only">Drag to reorder</span>
        </Button>
        <p className="truncate text-sm font-medium">{variant.label}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Edit variant"
          disabled={disabled}
          onClick={onEdit}
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Delete variant"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </li>
  )
}

function SortableInstructionRow({
  instruction,
  onEdit,
  onDelete,
  disabled,
}: {
  instruction: ProductCategoryInstructionRow
  onEdit: () => void
  onDelete: () => void
  disabled: boolean
}) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({
    id: instruction.id,
  })

  return (
    <li
      ref={setNodeRef}
      data-dragging={isDragging}
      className="relative z-0 flex items-center justify-between gap-2 px-3 py-2 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-transparent size-8 shrink-0"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
          <span className="sr-only">Drag to reorder</span>
        </Button>
        <p className="truncate text-sm font-medium">{instruction.label}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Edit instruction"
          disabled={disabled}
          onClick={onEdit}
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Delete instruction"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </li>
  )
}

function sortCategoryAddonLinks(rows: CategoryAddonLinkJoined[]) {
  return [...rows].sort(
    (a, b) => a.link.sortOrder - b.link.sortOrder || a.addon.name.localeCompare(b.addon.name),
  )
}

function SortableAddonLinkRow({
  row,
  onEdit,
  onRemove,
  disabled,
}: {
  row: CategoryAddonLinkJoined
  onEdit: () => void
  onRemove: () => void
  disabled: boolean
}) {
  const { attributes, listeners, transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.addon.id,
  })

  return (
    <li
      ref={setNodeRef}
      data-dragging={isDragging}
      className="relative z-0 flex items-center justify-between gap-2 px-3 py-2 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-transparent size-8 shrink-0"
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
          <span className="sr-only">Drag to reorder</span>
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {row.addon.name}
            {!row.addon.isActive ? (
              <span className="text-muted-foreground ml-2 text-xs font-normal">(inactive)</span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {formatMinorToDecimal2(row.addon.amountMinor)} {row.addon.currency}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Edit add-on"
          disabled={disabled}
          onClick={onEdit}
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Remove from category"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </li>
  )
}

export function CatalogCategoriesPanel({
  businessSlug,
  categories,
  categoryVariants,
  categoryInstructions,
  categoryAddonLinks,
}: {
  businessSlug: string
  categories: ProductCategoryRow[]
  categoryVariants: ProductCategoryVariantRow[]
  categoryInstructions: ProductCategoryInstructionRow[]
  categoryAddonLinks: CategoryAddonLinkJoined[]
}) {
  const router = useRouter()
  const categoriesRef = useRef(categories)
  categoriesRef.current = categories
  const categoryInstructionsRef = useRef(categoryInstructions)
  categoryInstructionsRef.current = categoryInstructions
  const categoryAddonLinksRef = useRef(categoryAddonLinks)
  categoryAddonLinksRef.current = categoryAddonLinks
  const categoryVariantsRef = useRef(categoryVariants)
  categoryVariantsRef.current = categoryVariants

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

  const instructionCountByCategoryId = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of categoryInstructions) {
      m.set(i.categoryId, (m.get(i.categoryId) ?? 0) + 1)
    }
    return m
  }, [categoryInstructions])

  const instructionLabelsSearchByCategoryId = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of categoryInstructions) {
      const cur = m.get(i.categoryId) ?? ""
      m.set(i.categoryId, `${cur} ${i.label}`)
    }
    return m
  }, [categoryInstructions])

  const addonCountByCategoryId = useMemo(() => {
    const m = new Map<string, number>()
    for (const row of categoryAddonLinks) {
      m.set(row.link.categoryId, (m.get(row.link.categoryId) ?? 0) + 1)
    }
    return m
  }, [categoryAddonLinks])

  const addonNamesSearchByCategoryId = useMemo(() => {
    const m = new Map<string, string>()
    for (const row of categoryAddonLinks) {
      const cur = m.get(row.link.categoryId) ?? ""
      m.set(row.link.categoryId, `${cur} ${row.addon.name}`)
    }
    return m
  }, [categoryAddonLinks])

  const displayData = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ordered
    return ordered.filter((row) => {
      const blob = `${row.sortOrder} ${row.name} ${row.icon ?? ""} ${variantLabelsSearchByCategoryId.get(row.id) ?? ""} ${addonNamesSearchByCategoryId.get(row.id) ?? ""} ${instructionLabelsSearchByCategoryId.get(row.id) ?? ""}`
      return blob.toLowerCase().includes(q)
    })
  }, [ordered, query, variantLabelsSearchByCategoryId, addonNamesSearchByCategoryId, instructionLabelsSearchByCategoryId])

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
        id: "addons",
        header: "Add-ons",
        accessorFn: (row) => addonCountByCategoryId.get(row.id) ?? 0,
        cell: ({ row }) => {
          const n = addonCountByCategoryId.get(row.original.id) ?? 0
          const label = n === 1 ? "1 add-on" : `${n} add-ons`
          return (
            <Button
              type="button"
              variant="ghost"
              className="h-auto gap-0 px-1 font-normal hover:bg-muted/80"
              onClick={() => {
                setAddonsError(null)
                setAddonsView("list")
                setAddonEdit(null)
                setNewAddonName("")
                setNewAddonAmount("")
                setAddonsCategory(row.original)
              }}
              aria-label={`${row.original.name}: ${label}`}
            >
              <Badge variant="outline" className="text-muted-foreground gap-1 font-normal">
                <BoxesIcon className="size-3 shrink-0" />
                {label}
              </Badge>
            </Button>
          )
        },
      },
      {
        id: "instructions",
        header: "Instructions",
        accessorFn: (row) => instructionCountByCategoryId.get(row.id) ?? 0,
        cell: ({ row }) => {
          const n = instructionCountByCategoryId.get(row.original.id) ?? 0
          const label = n === 1 ? "1 instruction" : `${n} instructions`
          return (
            <Button
              type="button"
              variant="ghost"
              className="h-auto gap-0 px-1 font-normal hover:bg-muted/80"
              onClick={() => {
                setInstrError(null)
                setInstructionsView("list")
                setInstrEdit(null)
                setNewInstrLabel("")
                setInstructionsCategory(row.original)
              }}
              aria-label={`${row.original.name}: ${label}`}
            >
              <Badge variant="outline" className="text-muted-foreground gap-1 font-normal">
                <ClipboardListIcon className="size-3 shrink-0" />
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
    [variantCountByCategoryId, addonCountByCategoryId, instructionCountByCategoryId],
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
  const [vEditLabel, setVEditLabel] = useState("")
  const [variantBusy, setVariantBusy] = useState(false)
  const [variantError, setVariantError] = useState<string | null>(null)

  const [orderedVariants, setOrderedVariants] = useState<ProductCategoryVariantRow[]>([])
  const orderedVariantsRef = useRef(orderedVariants)
  orderedVariantsRef.current = orderedVariants
  const variantsCategoryRef = useRef(variantsCategory)
  variantsCategoryRef.current = variantsCategory

  useEffect(() => {
    if (!variantsCategory) return
    setOrderedVariants(
      sortVariantRows(categoryVariants.filter((v) => v.categoryId === variantsCategory.id)),
    )
  }, [variantsCategory, categoryVariants])

  const [instructionsCategory, setInstructionsCategory] = useState<ProductCategoryRow | null>(null)
  const [instructionsView, setInstructionsView] = useState<"list" | "edit">("list")
  const [instrEdit, setInstrEdit] = useState<ProductCategoryInstructionRow | null>(null)
  const [newInstrLabel, setNewInstrLabel] = useState("")
  const [iEditLabel, setIEditLabel] = useState("")
  const [instrBusy, setInstrBusy] = useState(false)
  const [instrError, setInstrError] = useState<string | null>(null)

  const [orderedInstructions, setOrderedInstructions] = useState<ProductCategoryInstructionRow[]>([])
  const orderedInstructionsRef = useRef(orderedInstructions)
  orderedInstructionsRef.current = orderedInstructions
  const instructionsCategoryRef = useRef(instructionsCategory)
  instructionsCategoryRef.current = instructionsCategory

  useEffect(() => {
    if (!instructionsCategory) return
    setOrderedInstructions(
      sortInstructionRows(categoryInstructions.filter((i) => i.categoryId === instructionsCategory.id)),
    )
  }, [instructionsCategory, categoryInstructions])

  const [addonsCategory, setAddonsCategory] = useState<ProductCategoryRow | null>(null)
  const [addonsView, setAddonsView] = useState<"list" | "edit">("list")
  const [addonEdit, setAddonEdit] = useState<CategoryAddonLinkJoined | null>(null)
  const [aEditName, setAEditName] = useState("")
  const [aEditAmount, setAEditAmount] = useState("")
  const [addonsBusy, setAddonsBusy] = useState(false)
  const [addonsError, setAddonsError] = useState<string | null>(null)
  const [newAddonName, setNewAddonName] = useState("")
  const [newAddonAmount, setNewAddonAmount] = useState("")

  const [orderedAddonLinks, setOrderedAddonLinks] = useState<CategoryAddonLinkJoined[]>([])
  const orderedAddonLinksRef = useRef(orderedAddonLinks)
  orderedAddonLinksRef.current = orderedAddonLinks
  const addonsCategoryRef = useRef(addonsCategory)
  addonsCategoryRef.current = addonsCategory

  useEffect(() => {
    if (!addonsCategory) return
    setOrderedAddonLinks(
      sortCategoryAddonLinks(
        categoryAddonLinks.filter((row) => row.link.categoryId === addonsCategory.id),
      ),
    )
  }, [addonsCategory, categoryAddonLinks])

  const instructionSortableId = useMemo(
    () => `instr-dnd-${businessSlug}-${instructionsCategory?.id ?? "closed"}`,
    [businessSlug, instructionsCategory?.id],
  )

  const instructionDataIds = useMemo<UniqueIdentifier[]>(
    () => orderedInstructions.map((i) => i.id),
    [orderedInstructions],
  )

  const variantSortableId = useMemo(
    () => `variant-dnd-${businessSlug}-${variantsCategory?.id ?? "closed"}`,
    [businessSlug, variantsCategory?.id],
  )

  const variantDataIds = useMemo<UniqueIdentifier[]>(
    () => orderedVariants.map((v) => v.id),
    [orderedVariants],
  )

  const addonSortableId = useMemo(
    () => `addon-dnd-${businessSlug}-${addonsCategory?.id ?? "closed"}`,
    [businessSlug, addonsCategory?.id],
  )

  const addonDataIds = useMemo<UniqueIdentifier[]>(
    () => orderedAddonLinks.map((r) => r.addon.id),
    [orderedAddonLinks],
  )

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

  function handleInstructionDragEnd(event: DragEndEvent) {
    const cat = instructionsCategoryRef.current
    if (!cat) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const prev = orderedInstructionsRef.current
    const oldIndex = prev.findIndex((x) => x.id === String(active.id))
    const newIndex = prev.findIndex((x) => x.id === String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(prev, oldIndex, newIndex)
    setOrderedInstructions(next)

    void (async () => {
      try {
        await reorderCategoryInstructions(businessSlug, {
          categoryId: cat.id,
          orderedIds: next.map((x) => x.id),
        })
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save instruction order.")
        setOrderedInstructions(
          sortInstructionRows(
            categoryInstructionsRef.current.filter((i) => i.categoryId === cat.id),
          ),
        )
      }
    })()
  }

  function handleVariantDragEnd(event: DragEndEvent) {
    const cat = variantsCategoryRef.current
    if (!cat) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const prev = orderedVariantsRef.current
    const oldIndex = prev.findIndex((x) => x.id === String(active.id))
    const newIndex = prev.findIndex((x) => x.id === String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(prev, oldIndex, newIndex)
    setOrderedVariants(next)

    void (async () => {
      try {
        await reorderCategoryVariants(businessSlug, {
          categoryId: cat.id,
          orderedIds: next.map((x) => x.id),
        })
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save variant order.")
        setOrderedVariants(
          sortVariantRows(
            categoryVariantsRef.current.filter((v) => v.categoryId === cat.id),
          ),
        )
      }
    })()
  }

  function handleAddonDragEnd(event: DragEndEvent) {
    const cat = addonsCategoryRef.current
    if (!cat) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const prev = orderedAddonLinksRef.current
    const oldIndex = prev.findIndex((x) => x.addon.id === String(active.id))
    const newIndex = prev.findIndex((x) => x.addon.id === String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(prev, oldIndex, newIndex)
    setOrderedAddonLinks(next)

    void (async () => {
      try {
        await setCategoryAddonLinks(businessSlug, {
          categoryId: cat.id,
          addonIds: next.map((x) => x.addon.id),
        })
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save add-on order.")
        const cur = addonsCategoryRef.current
        if (cur) {
          setOrderedAddonLinks(
            sortCategoryAddonLinks(
              categoryAddonLinksRef.current.filter((row) => row.link.categoryId === cur.id),
            ),
          )
        }
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
                            : column.id === "instructions"
                              ? "Instructions"
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
              Preset labels for variant prices (e.g. Small / Medium / Large). Drag the handle to set order in the
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
                {orderedVariants.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-sm">No variants yet.</p>
                ) : (
                  <DndContext
                    id={variantSortableId}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleVariantDragEnd}
                    sensors={sensors}
                  >
                    <SortableContext items={variantDataIds} strategy={verticalListSortingStrategy}>
                      <ul className="divide-y">
                        {orderedVariants.map((v) => (
                          <SortableVariantRow
                            key={v.id}
                            variant={v}
                            disabled={variantBusy}
                            onEdit={() => {
                              setVariantEdit(v)
                              setVEditLabel(v.label)
                              setVariantsView("edit")
                              setVariantError(null)
                            }}
                            onDelete={() => {
                              void (async () => {
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
                              })()
                            }}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Add variant</p>
                <Field>
                  <FieldLabel>Label</FieldLabel>
                  <Input
                    value={newVariantLabel}
                    onChange={(e) => setNewVariantLabel(e.target.value)}
                    placeholder="Small"
                  />
                </Field>
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
                      })
                      setNewVariantLabel("")
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

      <Dialog
        open={!!addonsCategory}
        onOpenChange={(o) => {
          if (!o) {
            setAddonsCategory(null)
            setAddonsView("list")
            setAddonEdit(null)
            setAddonsError(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {addonsView === "edit" ? "Edit add-on" : `Add-ons · ${addonsCategory?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              {addonsView === "edit" ? (
                <>
                  Update name or price. Currency follows your business default (Settings → Business), or your default
                  branch if that is not set. Changes apply everywhere this add-on is linked. To hide it on the POS for
                  this category, remove it from the list.
                </>
              ) : (
                <>
                  Paid extras for products in this category (e.g. toppings, milk upgrade). Staff see them on the POS when
                  the product tier currency matches the add-on. Prices use the same default currency as catalog
                  products. Add new ones below; drag the handle to set POS order. Remove from the list to stop offering
                  one here.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {addonsView === "edit" && addonEdit && addonsCategory ? (
            <div className="grid gap-4">
              <RootFormError message={addonsError ?? undefined} />
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input value={aEditName} onChange={(e) => setAEditName(e.target.value)} disabled={addonsBusy} />
              </Field>
              <Field>
                <FieldLabel>Price</FieldLabel>
                <Input
                  value={aEditAmount}
                  onChange={(e) => setAEditAmount(e.target.value)}
                  inputMode="decimal"
                  disabled={addonsBusy}
                />
              </Field>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddonsView("list")
                    setAddonEdit(null)
                    setAddonsError(null)
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={addonsBusy}
                  onClick={async () => {
                    setAddonsBusy(true)
                    setAddonsError(null)
                    try {
                      await updateProductAddon(businessSlug, {
                        id: addonEdit.addon.id,
                        name: aEditName,
                        amount: aEditAmount,
                      })
                      setAddonsView("list")
                      setAddonEdit(null)
                      router.refresh()
                    } catch (e) {
                      setAddonsError(e instanceof Error ? e.message : "Something went wrong.")
                    } finally {
                      setAddonsBusy(false)
                    }
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="grid gap-4">
              <RootFormError message={addonsError ?? undefined} />
              <div className="space-y-2 rounded-xl border">
                {orderedAddonLinks.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-sm">No add-ons linked to this category yet.</p>
                ) : (
                  <DndContext
                    id={addonSortableId}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleAddonDragEnd}
                    sensors={sensors}
                  >
                    <SortableContext items={addonDataIds} strategy={verticalListSortingStrategy}>
                      <ul className="divide-y">
                        {orderedAddonLinks.map((row) => (
                          <SortableAddonLinkRow
                            key={row.link.id}
                            row={row}
                            disabled={addonsBusy}
                            onEdit={() => {
                              setAddonEdit(row)
                              setAEditName(row.addon.name)
                              setAEditAmount(formatMinorToDecimal2(row.addon.amountMinor))
                              setAddonsView("edit")
                              setAddonsError(null)
                            }}
                            onRemove={() => {
                              void (async () => {
                                if (!addonsCategory) return
                                const ids = orderedAddonLinksRef.current
                                  .map((x) => x.addon.id)
                                  .filter((id) => id !== row.addon.id)
                                setAddonsBusy(true)
                                setAddonsError(null)
                                try {
                                  await setCategoryAddonLinks(businessSlug, {
                                    categoryId: addonsCategory.id,
                                    addonIds: ids,
                                  })
                                  router.refresh()
                                } catch (e) {
                                  setAddonsError(e instanceof Error ? e.message : "Something went wrong.")
                                } finally {
                                  setAddonsBusy(false)
                                }
                              })()
                            }}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Add add-on</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <Input
                      value={newAddonName}
                      onChange={(e) => setNewAddonName(e.target.value)}
                      placeholder="Pearls"
                      disabled={addonsBusy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Price</FieldLabel>
                    <Input
                      value={newAddonAmount}
                      onChange={(e) => setNewAddonAmount(e.target.value)}
                      placeholder="0.50"
                      inputMode="decimal"
                      disabled={addonsBusy}
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  className="mt-3"
                  variant="secondary"
                  disabled={addonsBusy || !addonsCategory}
                  onClick={async () => {
                    if (!addonsCategory) return
                    setAddonsBusy(true)
                    setAddonsError(null)
                    try {
                      const { id } = await createProductAddon(businessSlug, {
                        name: newAddonName,
                        amount: newAddonAmount,
                      })
                      const next = [...orderedAddonLinks.map((x) => x.addon.id), id]
                      await setCategoryAddonLinks(businessSlug, {
                        categoryId: addonsCategory.id,
                        addonIds: next,
                      })
                      setNewAddonName("")
                      setNewAddonAmount("")
                      router.refresh()
                    } catch (e) {
                      setAddonsError(e instanceof Error ? e.message : "Something went wrong.")
                    } finally {
                      setAddonsBusy(false)
                    }
                  }}
                >
                  Add add-on
                </Button>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddonsCategory(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!instructionsCategory}
        onOpenChange={(o) => {
          if (!o) {
            setInstructionsCategory(null)
            setInstructionsView("list")
            setInstrEdit(null)
            setInstrError(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {instructionsView === "edit"
                ? "Edit special instruction"
                : `Special instructions · ${instructionsCategory?.name ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              Kitchen and prep notes for this category (e.g. sugar level, ice, allergens). Staff can select these on
              the POS; they appear on receipts and do not change price. Drag the handle to set the order shown on the
              POS.
            </DialogDescription>
          </DialogHeader>

          {instructionsView === "edit" && instrEdit && instructionsCategory ? (
            <div className="grid gap-4">
              <RootFormError message={instrError ?? undefined} />
              <Field>
                <FieldLabel>Label</FieldLabel>
                <Input value={iEditLabel} onChange={(e) => setIEditLabel(e.target.value)} />
              </Field>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInstructionsView("list")
                    setInstrEdit(null)
                    setInstrError(null)
                  }}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={instrBusy}
                  onClick={async () => {
                    setInstrBusy(true)
                    setInstrError(null)
                    try {
                      await updateCategoryInstruction(businessSlug, {
                        id: instrEdit.id,
                        categoryId: instructionsCategory.id,
                        label: iEditLabel,
                      })
                      setInstructionsView("list")
                      setInstrEdit(null)
                      router.refresh()
                    } catch (e) {
                      setInstrError(e instanceof Error ? e.message : "Something went wrong.")
                    } finally {
                      setInstrBusy(false)
                    }
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="grid gap-4">
              <RootFormError message={instrError ?? undefined} />
              <div className="space-y-2 rounded-xl border">
                {orderedInstructions.length === 0 ? (
                  <p className="text-muted-foreground p-4 text-sm">No special instructions yet.</p>
                ) : (
                  <DndContext
                    id={instructionSortableId}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleInstructionDragEnd}
                    sensors={sensors}
                  >
                    <SortableContext items={instructionDataIds} strategy={verticalListSortingStrategy}>
                      <ul className="divide-y">
                        {orderedInstructions.map((i) => (
                          <SortableInstructionRow
                            key={i.id}
                            instruction={i}
                            disabled={instrBusy}
                            onEdit={() => {
                              setInstrEdit(i)
                              setIEditLabel(i.label)
                              setInstructionsView("edit")
                              setInstrError(null)
                            }}
                            onDelete={() => {
                              void (async () => {
                                if (!instructionsCategory) return
                                setInstrBusy(true)
                                setInstrError(null)
                                try {
                                  await deleteCategoryInstruction(businessSlug, instructionsCategory.id, i.id)
                                  router.refresh()
                                } catch (e) {
                                  setInstrError(e instanceof Error ? e.message : "Something went wrong.")
                                } finally {
                                  setInstrBusy(false)
                                }
                              })()
                            }}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Add instruction</p>
                <Field>
                  <FieldLabel>Label</FieldLabel>
                  <Input
                    value={newInstrLabel}
                    onChange={(e) => setNewInstrLabel(e.target.value)}
                    placeholder="25% sugar"
                  />
                </Field>
                <Button
                  type="button"
                  className="mt-3"
                  variant="secondary"
                  disabled={instrBusy || !instructionsCategory}
                  onClick={async () => {
                    if (!instructionsCategory) return
                    setInstrBusy(true)
                    setInstrError(null)
                    try {
                      await createCategoryInstruction(businessSlug, {
                        categoryId: instructionsCategory.id,
                        label: newInstrLabel,
                      })
                      setNewInstrLabel("")
                      router.refresh()
                    } catch (e) {
                      setInstrError(e instanceof Error ? e.message : "Something went wrong.")
                    } finally {
                      setInstrBusy(false)
                    }
                  }}
                >
                  Add instruction
                </Button>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInstructionsCategory(null)}>
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
