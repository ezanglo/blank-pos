import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BusinessSettingsPanel } from "@/components/business/business-settings-panel"
import { businessDetailsRowToFormInitial, emptyBrandingFormValues } from "@/lib/branding-form-initial"
import { getBusinessDetailsByOrganizationId } from "@/lib/queries/business-details"
import { getOrgForUser } from "@/lib/queries/organization"
import { userCanEditBusinessDetailsForOrganization } from "@/lib/queries/stores"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Business settings",
  description: "Store name, branding, contact, and business details for this organization.",
}

export default async function OrganizationSettingsPage({
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
  const panelKey = `${businessSlug}-${ctx.organization.name}-${b?.updatedAt?.toISOString() ?? "none"}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Update organization-wide details in sections. Each card saves independently. Branch address and currency
          are managed under <span className="text-foreground font-medium">Business → Locations</span> (and per-branch
          location settings).
        </p>
      </div>
      <BusinessSettingsPanel
        key={panelKey}
        businessSlug={businessSlug}
        organizationName={ctx.organization.name}
        initial={initial}
      />
    </div>
  )
}
