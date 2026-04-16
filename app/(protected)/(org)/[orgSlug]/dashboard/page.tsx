import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getLocationByOrganizationId } from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { getStoreBranding } from "@/lib/queries/store-branding"
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

  const site = await getStoreBranding()
  const loc = await getLocationByOrganizationId(ctx.organization.id)
  const chainName = site?.displayName?.trim() || null
  const locationName = ctx.organization.name

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as <span className="text-foreground font-medium">{session.user.name}</span> (
        {ctx.member.role})
      </p>
      <div className="rounded-xl border p-4 text-sm">
        <p className="font-medium">{locationName}</p>
        {chainName && chainName !== locationName ? (
          <p className="text-muted-foreground mt-1">{chainName}</p>
        ) : null}
        {loc?.defaultCurrency ? (
          <p className="text-muted-foreground mt-1">Default currency: {loc.defaultCurrency}</p>
        ) : null}
        {loc?.phone ? <p className="text-muted-foreground mt-1">Phone: {loc.phone}</p> : null}
        {loc?.addressLine1 ? (
          <p className="text-muted-foreground mt-1">{loc.addressLine1}</p>
        ) : null}
      </div>
    </div>
  )
}
