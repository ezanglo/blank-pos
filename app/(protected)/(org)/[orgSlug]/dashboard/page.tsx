import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}): Promise<Metadata> {
  const { orgSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) {
    return { title: "Dashboard" }
  }
  return {
    title: ctx.organization.name,
    description: `Dashboard for ${ctx.organization.name}.`,
  }
}

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) notFound()

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
