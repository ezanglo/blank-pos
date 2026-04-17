import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { getLocationForUserByStoreAndLocationSlug } from "@/lib/queries/location"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string; locationSlug: string }>
}): Promise<Metadata> {
  const { storeSlug, locationSlug } = await params
  const session = await requireSession()
  const row = await getLocationForUserByStoreAndLocationSlug(storeSlug, locationSlug, session.user.id)
  if (!row) {
    return { title: "Dashboard" }
  }
  return {
    title: row.location.name,
    description: `Dashboard for ${row.location.name}.`,
  }
}

export default async function StoreLocationDashboardPage({
  params,
}: {
  params: Promise<{ storeSlug: string; locationSlug: string }>
}) {
  const { storeSlug, locationSlug } = await params
  const session = await requireSession()

  const row = await getLocationForUserByStoreAndLocationSlug(storeSlug, locationSlug, session.user.id)
  if (!row) notFound()

  return (
    <>
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
