"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
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
  PencilIcon,
  PlusIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ProductCategoryRow } from "@/lib/db/schema-catalog"
import type { ProductListRow } from "@/lib/queries/catalog"

import { catalogProductsColumnMenuLabel, formatLocationCell } from "./catalog-products-utils"

export function CatalogProductsDataTable({
  products,
  total,
  page,
  pageSize,
  totalPages,
  hasPrevPage,
  hasNextPage,
  onPrevPage,
  onNextPage,
  searchDraft,
  setSearchDraft,
  categoryFilterId,
  onCategoryChange,
  categoryFilterLabel,
  categoriesSorted,
  hasCategories,
  onAddProduct,
  onEditProduct,
  onRequestDelete,
  onOpenPrices,
}: {
  products: ProductListRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasPrevPage: boolean
  hasNextPage: boolean
  onPrevPage: () => void
  onNextPage: () => void
  searchDraft: string
  setSearchDraft: (q: string) => void
  categoryFilterId: string
  onCategoryChange: (categoryId: string) => void
  categoryFilterLabel: string
  categoriesSorted: ProductCategoryRow[]
  hasCategories: boolean
  onAddProduct: () => void
  onEditProduct: (productId: string) => void
  onRequestDelete: (productId: string) => void
  onOpenPrices: (row: ProductListRow) => void
}) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const columns = useMemo<ColumnDef<ProductListRow>[]>(
    () => [
      {
        id: "name",
        header: "Product",
        accessorFn: (r) => r.product.name,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2">
            {row.original.product.imageUrl ? (
              <Image
                src={row.original.product.imageUrl}
                alt=""
                width={36}
                height={36}
                className="border-border size-9 shrink-0 rounded-md border object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="border-border bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border text-xs"
                aria-hidden
              >
                —
              </span>
            )}
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
              onClick={() => onOpenPrices(row.original)}
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
              onClick={() => onEditProduct(row.original.product.id)}
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Delete"
              onClick={() => onRequestDelete(row.original.product.id)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [onEditProduct, onOpenPrices, onRequestDelete],
  )

  const table = useReactTable({
    data: products,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.product.id,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  })

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
          <Input
            placeholder="Search products…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            aria-label="Search products"
            className="min-w-0 max-w-sm flex-1"
          />
          {hasCategories ? (
            <Select
              value={categoryFilterId || "__all__"}
              onValueChange={(v) => onCategoryChange(!v || v === "__all__" ? "" : v)}
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
                    {catalogProductsColumnMenuLabel(column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" onClick={onAddProduct}>
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
      <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          {total === 0
            ? "0 products"
            : (() => {
                const from = (page - 1) * pageSize + 1
                const to = (page - 1) * pageSize + products.length
                return `Showing ${from}–${to} of ${total} product${total === 1 ? "" : "s"}`
              })()}
        </p>
        {total > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrevPage}
              onClick={onPrevPage}
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="text-foreground min-w-[7rem] text-center text-xs tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={onNextPage}
              aria-label="Next page"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
