"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { deleteProduct } from "@/lib/actions/catalog-products"
import type { ProductCategoryRow, ProductCategoryVariantRow } from "@/lib/db/schema-catalog"
import type { ProductListRow } from "@/lib/queries/catalog"

import { CatalogProductDeleteDialog } from "./catalog-product-delete-dialog"
import { CatalogProductFormDialog, type CatalogProductFormLaunch } from "./catalog-product-form-dialog"
import { CatalogProductPricesDialog } from "./catalog-product-prices-dialog"
import { CatalogProductsDataTable, filterProductsForDisplay } from "./catalog-products-data-table"

type Loc = { id: string; name: string }
type InvPick = { id: string; name: string; unit: string; costMinor: string }

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
  const [formLaunch, setFormLaunch] = useState<CatalogProductFormLaunch | null>(null)
  const [pricesAnchor, setPricesAnchor] = useState<ProductListRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [categoryFilterId, setCategoryFilterId] = useState("")

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

  const displayProducts = useMemo(
    () => filterProductsForDisplay(products, query, categoryFilterId),
    [products, query, categoryFilterId],
  )

  const submitDelete = async () => {
    if (!deleteId) return
    setBusy(true)
    setDeleteDialogError(null)
    try {
      await deleteProduct(businessSlug, deleteId)
      setDeleteId(null)
      router.refresh()
    } catch (e) {
      setDeleteDialogError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
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

      <CatalogProductsDataTable
        displayProducts={displayProducts}
        query={query}
        setQuery={setQuery}
        categoryFilterId={categoryFilterId}
        setCategoryFilterId={setCategoryFilterId}
        categoryFilterLabel={categoryFilterLabel}
        categoriesSorted={categoriesSorted}
        hasCategories={categories.length > 0}
        onAddProduct={() => setFormLaunch({ mode: "create" })}
        onEditProduct={(productId) => setFormLaunch({ mode: "edit", productId })}
        onRequestDelete={setDeleteId}
        onOpenPrices={(row) => setPricesAnchor(row)}
      />

      <CatalogProductFormDialog
        launch={formLaunch}
        onClose={() => setFormLaunch(null)}
        businessSlug={businessSlug}
        categories={categories}
        locations={locations}
        inventory={inventory}
        onSaved={() => router.refresh()}
      />

      <CatalogProductDeleteDialog
        productId={deleteId}
        busy={busy}
        errorMessage={deleteDialogError}
        onClose={() => {
          setDeleteId(null)
          setDeleteDialogError(null)
        }}
        onConfirm={submitDelete}
      />

      <CatalogProductPricesDialog
        anchorRow={pricesAnchor}
        onClose={() => setPricesAnchor(null)}
        businessSlug={businessSlug}
        categoryVariants={categoryVariants}
      />
    </div>
  )
}
