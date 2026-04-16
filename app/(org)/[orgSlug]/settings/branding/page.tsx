import { notFound } from "next/navigation"

import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

import { BrandingSettingsForm } from "./branding-settings-form"

export const dynamic = "force-dynamic"

export default async function BrandingSettingsPage({
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

  const b = ctx.branding
  const initial = {
    displayName: b?.displayName ?? ctx.organization.name,
    tagline: b?.tagline ?? "",
    primaryColor: b?.primaryColor ?? "#171717",
    accentColor: b?.accentColor ?? "#404040",
    receiptHeaderText: b?.receiptHeaderText ?? "",
    receiptFooterText: b?.receiptFooterText ?? "",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-muted-foreground text-sm">Receipt-facing name, colors, and copy.</p>
      </div>
      <BrandingSettingsForm orgSlug={orgSlug} initial={initial} />
    </div>
  )
}
