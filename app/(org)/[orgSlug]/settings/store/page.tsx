import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getLocationByOrganizationId } from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

import { StoreSettingsForm } from "@/components/settings/store-settings-form"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}): Promise<Metadata> {
  const { orgSlug } = await params
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { title: "Location" }
  }
  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) {
    return { title: "Location" }
  }
  return {
    title: `Location · ${ctx.organization.name}`,
    description: `Store name, web address, and contact details for ${ctx.organization.name}.`,
  }
}

export default async function StoreSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await getServerSession()
  if (!session?.user?.id) notFound()

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const initialLocation = await getLocationByOrganizationId(ctx.organization.id)

  return (
    <StoreSettingsForm
      orgSlug={orgSlug}
      initialName={ctx.organization.name}
      initialLocation={initialLocation}
    />
  )
}
