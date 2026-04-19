import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CatalogInventoryMovementsPanel } from "@/components/catalog/catalog-inventory-movements-panel"
import { listInventoryItemsWithStock } from "@/lib/queries/catalog"
import {
  listInventoryMovementsPage,
  type InventoryMovementListFilters,
} from "@/lib/queries/inventory-movements"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

function parseFilters(sp: Record<string, string | string[] | undefined>): InventoryMovementListFilters {
  const g = (k: string) => {
    const v = sp[k]
    return typeof v === "string" ? v : ""
  }
  const page = Math.max(1, Number.parseInt(g("page"), 10) || 1)
  const pageSize = Math.min(100, Math.max(5, Number.parseInt(g("pageSize"), 10) || 25))
  const type = g("type") as InventoryMovementListFilters["type"]
  const validType = type === "in" || type === "out" || type === "adjustment" ? type : ""

  const today = new Date()
  const toDefault = today.toISOString().slice(0, 10)
  const fromD = new Date(today)
  fromD.setUTCDate(fromD.getUTCDate() - 7)
  const fromDefault = fromD.toISOString().slice(0, 10)

  return {
    type: validType,
    search: g("search"),
    dateFrom: g("from") || fromDefault,
    dateTo: g("to") || toDefault,
    page,
    pageSize,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}): Promise<Metadata> {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) return { title: "Stock movements" }
  return { title: `Stock movements · ${ctx.organization.name}` }
}

export default async function InventoryMovementsPage({
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

  const sp = await searchParams
  const filters = parseFilters(sp)

  const [result, inventoryItems] = await Promise.all([
    listInventoryMovementsPage(ctx.organization.id, filters),
    listInventoryItemsWithStock(ctx.organization.id),
  ])

  return (
    <CatalogInventoryMovementsPanel
      businessSlug={businessSlug}
      filters={filters}
      rows={result.rows}
      total={result.total}
      inventoryItems={inventoryItems}
    />
  )
}
