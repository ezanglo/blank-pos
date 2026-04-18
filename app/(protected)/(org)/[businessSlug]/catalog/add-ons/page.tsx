import { notFound } from "next/navigation"

import { CatalogAddOnsPanel } from "@/components/catalog/catalog-add-ons-panel"
import { getOrgForUser } from "@/lib/queries/organization"
import { listProductCategories } from "@/lib/queries/catalog"
import { listProductAddonsWithCategories } from "@/lib/queries/catalog-addons"
import { getDefaultCatalogCurrencyCode } from "@/lib/queries/catalog-currency"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function CatalogAddOnsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role === "cashier") notFound()

  const organizationId = ctx.organization.id
  const [categories, addons, defaultCurrency] = await Promise.all([
    listProductCategories(organizationId),
    listProductAddonsWithCategories(organizationId),
    getDefaultCatalogCurrencyCode(organizationId),
  ])

  return (
    <CatalogAddOnsPanel
      businessSlug={businessSlug}
      categories={categories}
      addons={addons}
      defaultCurrency={defaultCurrency}
    />
  )
}
