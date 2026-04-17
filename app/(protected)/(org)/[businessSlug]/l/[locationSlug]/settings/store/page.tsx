import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { StoreSettingsForm } from "@/components/settings/store-settings-form"
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
    return { title: "Location" }
  }
  return {
    title: `Location · ${row.location.name}`,
    description: `Branch details for ${row.organization.name}.`,
  }
}

export default async function LocationSettingsPage({
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
  if (row.member.role !== "owner" && row.member.role !== "manager") notFound()

  return (
    <StoreSettingsForm
      businessSlug={businessSlug}
      locationSlug={locationSlug}
      initialStoreName={row.organization.name}
      initialLocation={row.location}
    />
  )
}
