import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { CatalogInventoryPanel } from "@/components/settings/catalog-inventory-panel"
import { listInventoryItemsWithStock } from "@/lib/queries/catalog"
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
  if (!ctx) return { title: "Inventory" }
  return { title: `Inventory · ${ctx.organization.name}` }
}

export default async function CatalogInventoryPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const rows = await listInventoryItemsWithStock(ctx.organization.id)

  return (
    <Suspense fallback={null}>
      <CatalogInventoryPanel businessSlug={businessSlug} rows={rows} />
    </Suspense>
  )
}
