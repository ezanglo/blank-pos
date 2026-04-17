import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { LocationsAdminPanel, type LocationAdminRow } from "@/components/business/locations-admin-panel"
import { listLocationsForOrganization } from "@/lib/queries/location"
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
  if (!ctx) {
    return { title: "Locations" }
  }
  return {
    title: `Locations · ${ctx.organization.name}`,
    description: `Manage branches for ${ctx.organization.name}.`,
  }
}

function toRow(loc: {
  id: string
  slug: string
  name: string
  isDefault: boolean
  defaultCurrency: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  phone: string | null
}): LocationAdminRow {
  return {
    id: loc.id,
    slug: loc.slug,
    name: loc.name,
    isDefault: loc.isDefault,
    defaultCurrency: loc.defaultCurrency,
    addressLine1: loc.addressLine1,
    addressLine2: loc.addressLine2,
    city: loc.city,
    region: loc.region,
    postalCode: loc.postalCode,
    phone: loc.phone,
  }
}

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const locations = await listLocationsForOrganization(ctx.organization.id)
  const rows: LocationAdminRow[] = locations.map(toRow)

  return (
    <Suspense fallback={null}>
      <LocationsAdminPanel businessSlug={businessSlug} locations={rows} />
    </Suspense>
  )
}
