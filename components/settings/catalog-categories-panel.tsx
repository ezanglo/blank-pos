"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Layers2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
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
  createCategoryVariant,
  deleteCategoryVariant,
  updateCategoryVariant,
} from "@/lib/actions/catalog-category-variants"
import {
  createProductCategory,
  deleteProductCategory,
  updateProductCategory,
} from "@/lib/actions/catalog-categories"
import type { ProductCategoryRow, ProductCategoryVariantRow } from "@/lib/db/schema-catalog"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
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
  const [addOpen, setAddOpen] = useState(false)
  const [editRow, setEditRow] = useState<ProductCategoryRow | null>(null)
  const [deleteRow, setDeleteRow] = useState<ProductCategoryRow | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState("")
  const [icon, setIcon] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
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
      setSortOrder(String(row.sortOrder))
    } else {
      setName("")
      setColor("")
      setIcon("")
      setSortOrder("0")
    }
  }

  const columns = useMemo<ColumnDef<ProductCategoryRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "sortOrder", header: "Order", cell: ({ row }) => row.original.sortOrder },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Variants"
              title="Variants"
              onClick={() => {
                setVariantError(null)
                setVariantsView("list")
                setVariantEdit(null)
                setNewVariantLabel("")
                setNewVariantSort("0")
                setVariantsCategory(row.original)
              }}
            >
              <Layers2Icon className="size-4" />
            </Button>
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
    [],
  )

  async function submitCreate() {
    setBusy(true)
    setFormError(null)
    try {
      await createProductCategory(businessSlug, {
        name,
        color: color || null,
        icon: icon || null,
        sortOrder: Number(sortOrder) || 0,
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
        sortOrder: Number(sortOrder) || 0,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Group catalog items for filters and reporting. Products require a category.
        </p>
      </div>

      <AdminSettingsTable
        columns={columns}
        data={categories}
        searchPlaceholder="Search categories…"
        searchText={(r) => `${r.name} ${r.icon ?? ""}`}
        toolbarRight={
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
        }
      />

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
            <Field>
              <FieldLabel>Sort order</FieldLabel>
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
            </Field>
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
            <Field>
              <FieldLabel>Sort order</FieldLabel>
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </Field>
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
