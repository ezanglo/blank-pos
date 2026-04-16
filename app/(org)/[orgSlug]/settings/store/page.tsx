import { notFound } from "next/navigation"

import { parseOrgMetadata } from "@/lib/org-metadata"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

import { StoreSettingsForm } from "./store-settings-form"

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
        <p className="text-muted-foreground text-sm">Organization name and site details.</p>
      </div>
      <StoreSettingsForm orgSlug={orgSlug} initialName={ctx.organization.name} initialMeta={meta} />
    </div>
  )
}
