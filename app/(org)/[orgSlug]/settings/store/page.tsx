import { notFound } from "next/navigation"

import { parseOrgMetadata } from "@/lib/org-metadata"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

import { StoreSettingsForm } from "@/components/settings/store-settings-form"

export const dynamic = "force-dynamic"

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

  const meta = parseOrgMetadata(ctx.organization.metadata)

  return <StoreSettingsForm orgSlug={orgSlug} initialName={ctx.organization.name} initialMeta={meta} />
}
