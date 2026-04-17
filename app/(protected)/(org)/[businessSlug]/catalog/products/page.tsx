import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { CatalogProductsPanel } from "@/components/settings/catalog-products-panel"
import {
  listCategoryVariantsForOrganization,
  listInventoryItemsWithStock,
  listProductCategories,
  listProductsWithCategory,
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
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const [products, categories, locations, invRows, categoryVariants] = await Promise.all([
    listProductsWithCategory(ctx.organization.id),
    listProductCategories(ctx.organization.id),
    listLocationsForOrganization(ctx.organization.id),
    listInventoryItemsWithStock(ctx.organization.id),
    listCategoryVariantsForOrganization(ctx.organization.id),
  ])

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
        categories={categories}
        categoryVariants={categoryVariants}
        locations={locDtos}
        inventory={inventory}
      />
    </Suspense>
  )
}
