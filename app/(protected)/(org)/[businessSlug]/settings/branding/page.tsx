import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BrandingSettingsForm } from "@/components/settings/branding-settings-form"
import { businessDetailsRowToFormInitial, emptyBrandingFormValues } from "@/lib/branding-form-initial"
import { getBusinessDetailsByOrganizationId } from "@/lib/queries/business-details"
import { getOrgForUser } from "@/lib/queries/organization"
import { userCanEditBusinessDetailsForOrganization } from "@/lib/queries/stores"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Branding",
  description: "Logos, colors, display name, and business details for this organization.",
}

export default async function BusinessBrandingSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()

  const allowed = await userCanEditBusinessDetailsForOrganization(
    session.user.id,
    ctx.organization.id,
  )
  if (!allowed) notFound()

  const b = await getBusinessDetailsByOrganizationId(ctx.organization.id)
  const initial = b ? businessDetailsRowToFormInitial(b) : emptyBrandingFormValues()

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Logos, colors, how you describe this business, sign-in page art, contact lines, and optional
          receipt copy—all scoped to this organization. For branch address and currency, use Location
          under a branch.
        </p>
      </div>
      <BrandingSettingsForm businessSlug={businessSlug} initial={initial} />
    </div>
  )
}
