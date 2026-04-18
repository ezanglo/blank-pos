import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { CatalogProductsPanel } from "@/components/catalog/catalog-products-panel"
import { parseCatalogProductsUrlState } from "@/lib/catalog-products-url"
import {
  listCatalogProductsPage,
  listCategoryVariantsForOrganization,
  listInventoryItemsWithStock,
  listProductCategories,
} from "@/lib/queries/catalog"
import { listLocationsForOrganization } from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}): Promise<Metadata> {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) return { title: "Products" }
  return { title: `Products · ${ctx.organization.name}` }
}

export default async function CatalogProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const url = parseCatalogProductsUrlState(await searchParams)

  const [pageResult, categories, locations, invRows, categoryVariants] = await Promise.all([
    listCatalogProductsPage(
      ctx.organization.id,
      { search: url.search, categoryId: url.categoryId },
      url.page,
      url.pageSize,
    ),
    listProductCategories(ctx.organization.id),
    listLocationsForOrganization(ctx.organization.id),
    listInventoryItemsWithStock(ctx.organization.id),
    listCategoryVariantsForOrganization(ctx.organization.id),
  ])
  const { rows: products, total } = pageResult

  const inventory = invRows.map((r) => ({
    id: r.item.id,
    name: r.item.name,
    unit: r.item.unit,
    costMinor: r.item.costPerUnitMinor.toString(),
  }))

  const locDtos = locations.map((l) => ({ id: l.id, name: l.name }))

  return (
    <Suspense fallback={null}>
      <CatalogProductsPanel
        businessSlug={businessSlug}
        products={products}
        total={total}
        categories={categories}
        categoryVariants={categoryVariants}
        locations={locDtos}
        inventory={inventory}
      />
    </Suspense>
  )
}
