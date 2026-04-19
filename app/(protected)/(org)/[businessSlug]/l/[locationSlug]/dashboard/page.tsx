import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DashboardLowStockBanner } from "@/components/dashboard-low-stock-banner"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { listInventoryBelowReorder } from "@/lib/queries/catalog"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string }>
}): Promise<Metadata> {
  const { businessSlug, locationSlug } = await params
  const session = await requireSession()
  const row = await getLocationForUserByBusinessAndLocationSlug(
    businessSlug,
    locationSlug,
    session.user.id,
  )
  if (!row) {
    return { title: "Dashboard" }
  }
  return {
    title: row.location.name,
    description: `Dashboard for ${row.location.name}.`,
  }
}

export default async function BusinessLocationDashboardPage({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string }>
}) {
  const { businessSlug, locationSlug } = await params
  const session = await requireSession()

  const row = await getLocationForUserByBusinessAndLocationSlug(
    businessSlug,
    locationSlug,
    session.user.id,
  )
  if (!row) notFound()

  const showLowStock = row.member.role === "owner" || row.member.role === "manager"
  const belowReorder = showLowStock
    ? await listInventoryBelowReorder(row.organization.id)
    : []

  return (
    <>
      <DashboardLowStockBanner businessSlug={businessSlug} items={belowReorder} />
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable
        data={[
          {
            id: 1,
            header: "Header",
            type: "Type",
            status: "Status",
            target: "Target",
            limit: "Limit",
            reviewer: "Reviewer",
          },
        ]}
      />
    </>
  )
}
