"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

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
  createProductAddon,
  deleteProductAddon,
  setProductAddonCategories,
  updateProductAddon,
} from "@/lib/actions/catalog-addons"
import type { ProductCategoryRow } from "@/lib/db/schema-catalog"
import { formatMinorToDecimal2 } from "@/lib/money"
import type { ProductAddonWithCategories } from "@/lib/queries/catalog-addons"

function RootFormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
      {message}
    </p>
  )
}

export function CatalogAddOnsPanel({
  businessSlug,
  addons,
  categories,
  defaultCurrency,
}: {
  businessSlug: string
  addons: ProductAddonWithCategories[]
  categories: ProductCategoryRow[]
  defaultCurrency: string
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProductAddonWithCategories | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductAddonWithCategories | null>(null)
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [isActive, setIsActive] = useState(true)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const categoriesSorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  )

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of categories) m.set(c.id, c.name)
    return m
  }, [categories])

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setName("")
    setAmount("")
    setCurrency(defaultCurrency)
    setIsActive(true)
    setSelectedCategoryIds(new Set())
    setDialogOpen(true)
  }

  function openEdit(row: ProductAddonWithCategories) {
    setEditing(row)
    setFormError(null)
    setName(row.name)
    setAmount(formatMinorToDecimal2(row.amountMinor))
    setCurrency(row.currency)
    setIsActive(row.isActive)
    setSelectedCategoryIds(new Set(row.categoryIds))
    setDialogOpen(true)
  }

  async function submitForm() {
    setBusy(true)
    setFormError(null)
    try {
      if (editing) {
        await updateProductAddon(businessSlug, {
          id: editing.id,
          name,
          amount,
          currency,
          isActive,
        })
        await setProductAddonCategories(businessSlug, {
          addonId: editing.id,
          categoryIds: [...selectedCategoryIds],
        })
      } else {
        const { id } = await createProductAddon(businessSlug, { name, amount, currency })
        if (selectedCategoryIds.size > 0) {
          await setProductAddonCategories(businessSlug, {
            addonId: id,
            categoryIds: [...selectedCategoryIds],
          })
        }
      }
      setDialogOpen(false)
      router.refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    setDeleteError(null)
    try {
      await deleteProductAddon(businessSlug, deleteTarget.id)
      setDeleteTarget(null)
      router.refresh()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  function toggleCategory(id: string, checked: boolean) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add-ons</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Options like toppings or milk swaps. Link each add-on to one or more product categories so they appear on
            the POS for drinks in those categories.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0 gap-2">
          <PlusIcon className="size-4" />
          Add add-on
        </Button>
      </div>

      {addons.length === 0 ? (
        <p className="text-muted-foreground rounded-2xl border border-dashed py-12 text-center text-sm">
          No add-ons yet. Create one and assign it to categories (e.g. Milk Tea → Pearl).
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {addons.map((row) => {
            const catLabels = row.categoryIds
              .map((id) => categoryNameById.get(id))
              .filter(Boolean)
              .join(", ")
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {row.name}
                    {!row.isActive ? (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">(inactive)</span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {formatMinorToDecimal2(row.amountMinor)} {row.currency}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {catLabels ? `Categories: ${catLabels}` : "Not linked to any category — won’t show on POS."}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${row.name}`}
                    onClick={() => openEdit(row)}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${row.name}`}
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteTarget(row)
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit add-on" : "New add-on"}</DialogTitle>
            <DialogDescription>
              Price uses your business minor units (same as product prices). Choose categories where this option should
              appear.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RootFormError message={formError ?? undefined} />
            <Field>
              <FieldLabel htmlFor="addon-name">Name</FieldLabel>
              <Input
                id="addon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pearl, Oat milk"
                className="rounded-xl"
                autoComplete="off"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="addon-amount">Price</FieldLabel>
                <Input
                  id="addon-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl tabular-nums"
                  inputMode="decimal"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="addon-currency">Currency</FieldLabel>
                <Input
                  id="addon-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="PHP"
                  className="rounded-xl uppercase"
                  maxLength={8}
                />
              </Field>
            </div>
            {editing ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
                Active (inactive add-ons stay on past receipts but won’t appear on POS)
              </label>
            ) : null}
            <Field>
              <FieldLabel>Categories</FieldLabel>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border p-3">
                {categoriesSorted.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Create product categories first.</p>
                ) : (
                  categoriesSorted.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedCategoryIds.has(c.id)}
                        onCheckedChange={(v) => toggleCategory(c.id, v === true)}
                      />
                      {c.name}
                    </label>
                  ))
                )}
              </div>
            </Field>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={submitForm} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete add-on?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove “${deleteTarget.name}” from the catalog. This fails if the add-on is referenced on a past sale.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <RootFormError message={deleteError ?? undefined} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
