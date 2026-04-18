"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  mergeCatalogProductsUrlState,
  parseCatalogProductsUrlState,
  serializeCatalogProductsUrlState,
  type CatalogProductsUrlState,
} from "@/lib/catalog-products-url"
import { deleteProduct } from "@/lib/actions/catalog-products"
import type { ProductCategoryRow, ProductCategoryVariantRow } from "@/lib/db/schema-catalog"
import type { ProductListRow } from "@/lib/queries/catalog"

import { CatalogProductDeleteDialog } from "./catalog-product-delete-dialog"
import { CatalogProductFormDialog, type CatalogProductFormLaunch } from "./catalog-product-form-dialog"
import { CatalogProductIngredientsDialog } from "./catalog-product-ingredients-dialog"
import { CatalogProductPricesDialog } from "./catalog-product-prices-dialog"
import { CatalogProductsDataTable } from "./catalog-products-data-table"

type Loc = { id: string; name: string }
type InvPick = { id: string; name: string; unit: string; costMinor: string }

export function CatalogProductsPanel({
  businessSlug,
  products,
  total,
  categories,
  categoryVariants,
  locations,
  inventory,
}: {
  businessSlug: string
  products: ProductListRow[]
  total: number
  categories: ProductCategoryRow[]
  categoryVariants: ProductCategoryVariantRow[]
  locations: Loc[]
  inventory: InvPick[]
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

  const [formLaunch, setFormLaunch] = useState<CatalogProductFormLaunch | null>(null)
  const [recipeTarget, setRecipeTarget] = useState<{ id: string; name: string } | null>(null)
  const [pricesAnchor, setPricesAnchor] = useState<ProductListRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null)

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

  const categoriesSorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  )

  useEffect(() => {
    if (urlState.categoryId && !categories.some((c) => c.id === urlState.categoryId)) {
      pushUrlState({ categoryId: "" })
    }
  }, [categories, pushUrlState, urlState.categoryId])

  const categoryFilterLabel = useMemo(() => {
    if (!urlState.categoryId) return "All categories"
    const c = categoriesSorted.find((x) => x.id === urlState.categoryId)
    return c?.name ?? "All categories"
  }, [categoriesSorted, urlState.categoryId])

  const totalPages = Math.max(1, Math.ceil(total / urlState.pageSize))
  const hasPrevPage = urlState.page > 1
  const hasNextPage = urlState.page < totalPages

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
          Add a product with category and availability. Use the green prices badge for variant tiers and the flask
          icon in the Ingredients column to manage recipes. Search and filters apply across the whole catalog
          (server-side).
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="border-border bg-muted/40 rounded-xl border px-4 py-3 text-sm">
          Create at least one <strong>category</strong> before adding products.
        </p>
      ) : null}

      <CatalogProductsDataTable
        products={products}
        total={total}
        page={urlState.page}
        pageSize={urlState.pageSize}
        totalPages={totalPages}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPrevPage={() => hasPrevPage && pushUrlState({ page: urlState.page - 1 })}
        onNextPage={() => hasNextPage && pushUrlState({ page: urlState.page + 1 })}
        searchDraft={searchDraft}
        setSearchDraft={setSearchDraft}
        categoryFilterId={urlState.categoryId}
        onCategoryChange={(id) => pushUrlState({ categoryId: id })}
        categoryFilterLabel={categoryFilterLabel}
        categoriesSorted={categoriesSorted}
        hasCategories={categories.length > 0}
        onAddProduct={() => setFormLaunch({ mode: "create" })}
        onEditProduct={(productId) => setFormLaunch({ mode: "edit", productId })}
        onRequestDelete={setDeleteId}
        onOpenPrices={(row) => setPricesAnchor(row)}
        hasInventoryItems={inventory.length > 0}
        onEditRecipe={(row) => setRecipeTarget({ id: row.product.id, name: row.product.name })}
      />

      <CatalogProductFormDialog
        launch={formLaunch}
        onClose={() => setFormLaunch(null)}
        businessSlug={businessSlug}
        categories={categories}
        locations={locations}
        onSaved={() => router.refresh()}
      />

      {recipeTarget ? (
        <CatalogProductIngredientsDialog
          key={recipeTarget.id}
          open
          onOpenChange={(next) => {
            if (!next) setRecipeTarget(null)
          }}
          businessSlug={businessSlug}
          productId={recipeTarget.id}
          productName={recipeTarget.name}
          inventory={inventory}
          onSaved={() => {
            setRecipeTarget(null)
            router.refresh()
          }}
        />
      ) : null}

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
