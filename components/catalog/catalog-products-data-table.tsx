"use client"

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
  FlaskConicalIcon,
  PencilIcon,
  PlusIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"

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

import {
  catalogProductsColumnMenuLabel,
  formatLocationCell,
} from "./catalog-products-utils"

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
  onEditRecipe,
  hasInventoryItems,
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
  onEditRecipe: (row: ProductListRow) => void
  hasInventoryItems: boolean
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
                className="size-9 shrink-0 rounded-md border border-border object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground"
                aria-hidden
              >
                —
              </span>
            )}
            <span>{row.original.product.name}</span>
            {row.original.product.isComposite ? (
              <span className="text-xs text-muted-foreground">Composite</span>
            ) : null}
            {!row.original.product.isActive ? (
              <span className="text-xs text-muted-foreground">Inactive</span>
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
          <span
            className="max-w-56 truncate text-sm"
            title={formatLocationCell(row.original)}
          >
            {formatLocationCell(row.original)}
          </span>
        ),
      },
      {
        id: "ingredients",
        header: "Ingredients",
        accessorFn: (r) =>
          r.product.isComposite
            ? `${r.firstIngredientPreview ?? ""} ${r.ingredientCount}`.trim()
            : "",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original
          const rest =
            r.ingredientCount > 1 ? ` · ${r.ingredientCount} lines` : ""
          const summary = !r.product.isComposite
            ? "No recipe"
            : r.ingredientCount === 0
              ? "Empty recipe"
              : `${r.firstIngredientPreview ?? ""}${rest}`.trim()
          return (
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={!hasInventoryItems}
              title={
                hasInventoryItems
                  ? `${summary} — click to edit`
                  : "Add inventory items before building a recipe"
              }
              aria-label={`Edit ingredients: ${r.product.name}. ${summary}`}
              onClick={() => onEditRecipe(r)}
            >
              <FlaskConicalIcon className="size-4" />
            </Button>
          )
        },
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
    [
      hasInventoryItems,
      onEditProduct,
      onEditRecipe,
      onOpenPrices,
      onRequestDelete,
    ]
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
            className="max-w-sm min-w-0 flex-1"
          />
          {hasCategories ? (
            <Select
              value={categoryFilterId || "__all__"}
              onValueChange={(v) =>
                onCategoryChange(!v || v === "__all__" ? "" : v)
              }
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
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                />
              }
            >
              <TableIcon className="size-4" />
              <span className="hidden lg:inline">Customize Columns</span>
              <span className="lg:hidden">Columns</span>
              <ChevronDownIcon className="size-4 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
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
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
            <span className="min-w-[7rem] text-center text-xs text-foreground tabular-nums">
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
