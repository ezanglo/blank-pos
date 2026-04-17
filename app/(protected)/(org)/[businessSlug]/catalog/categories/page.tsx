import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { CatalogCategoriesPanel } from "@/components/catalog/catalog-categories-panel"
import { listCategoryVariantsForOrganization, listProductCategories } from "@/lib/queries/catalog"
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
  if (!ctx) return { title: "Categories" }
  return { title: `Categories · ${ctx.organization.name}` }
}

export default async function CatalogCategoriesPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const [categories, categoryVariants] = await Promise.all([
    listProductCategories(ctx.organization.id),
    listCategoryVariantsForOrganization(ctx.organization.id),
  ])

  return (
    <Suspense fallback={null}>
      <CatalogCategoriesPanel
        businessSlug={businessSlug}
        categories={categories}
        categoryVariants={categoryVariants}
      />
    </Suspense>
  )
}
