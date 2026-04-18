import { notFound } from "next/navigation"

import { PosTerminal } from "@/components/pos/pos-terminal"
import { listProductCategories } from "@/lib/queries/catalog"
import { listActiveAddonsByCategoryId } from "@/lib/queries/catalog-addons"
import { listPosProductsForLocation } from "@/lib/queries/pos"
import { getLocationByOrganizationAndSlug } from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function PosPage({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string }>
}) {
  const { businessSlug, locationSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()

  const location = await getLocationByOrganizationAndSlug(ctx.organization.id, locationSlug)
  if (!location) notFound()

  const [categories, products, addonsByCategory] = await Promise.all([
    listProductCategories(ctx.organization.id),
    listPosProductsForLocation(ctx.organization.id, location.id, { search: "", categoryId: "" }),
    listActiveAddonsByCategoryId(ctx.organization.id),
  ])

  return (
    <div className="flex min-h-0 flex-1 touch-manipulation flex-col pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex min-h-0 flex-1 flex-col">
        <PosTerminal
          businessSlug={businessSlug}
          locationSlug={locationSlug}
          products={products}
          categories={categories}
          addonsByCategory={addonsByCategory}
        />
      </div>
    </div>
  )
}
