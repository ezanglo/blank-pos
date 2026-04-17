import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { StoreSettingsForm } from "@/components/settings/store-settings-form"
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
  params: Promise<{ storeSlug: string; locationSlug: string }>
}) {
  const { storeSlug, locationSlug } = await params
  const session = await requireSession()

  const row = await getLocationForUserByStoreAndLocationSlug(storeSlug, locationSlug, session.user.id)
  if (!row) notFound()
  if (row.member.role !== "owner" && row.member.role !== "manager") notFound()

  return (
    <StoreSettingsForm
      storeSlug={storeSlug}
      locationSlug={locationSlug}
      initialStoreName={row.organization.name}
      initialLocation={row.location}
    />
  )
}
