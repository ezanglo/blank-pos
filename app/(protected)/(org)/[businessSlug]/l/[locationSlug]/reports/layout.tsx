import { notFound } from "next/navigation"

import { ReportsSubNavClient } from "@/components/reports-sub-nav-client"
import { getLocationForUserByBusinessAndLocationSlug } from "@/lib/queries/location"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function ReportsLayout({
  children,
  params,
}: {
  children: React.ReactNode
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
  if (row.member.role !== "owner" && row.member.role !== "manager") notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Branch-scoped sales metrics (subtotal only; tax excluded). Cashiers do not see this section.
        </p>
      </div>
      <ReportsSubNavClient businessSlug={businessSlug} locationSlug={locationSlug} />
      {children}
    </div>
  )
}
