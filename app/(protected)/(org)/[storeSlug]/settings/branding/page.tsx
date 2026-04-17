import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BrandingSettingsForm } from "@/components/settings/branding-settings-form"
import { emptyBrandingFormValues, storeBrandingRowToFormInitial } from "@/lib/branding-form-initial"
import { getOrgForUser } from "@/lib/queries/organization"
import { getStoreBrandingByOrganizationId } from "@/lib/queries/store-branding"
import { userCanEditStoreBrandingForOrganization } from "@/lib/queries/stores"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Branding",
  description: "Store logos, colors, display name, and business details for this store.",
}

export default async function StoreBrandingSettingsPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(storeSlug, session.user.id)
  if (!ctx) notFound()

  const allowed = await userCanEditStoreBrandingForOrganization(session.user.id, ctx.organization.id)
  if (!allowed) notFound()

  const b = await getStoreBrandingByOrganizationId(ctx.organization.id)
  const initial = b ? storeBrandingRowToFormInitial(b) : emptyBrandingFormValues()

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Logos, colors, how you describe this store, sign-in page art, contact lines, and optional
          receipt copy—all scoped to this store. For branch address and currency, use Location under
          a branch.
        </p>
      </div>
      <BrandingSettingsForm storeSlug={storeSlug} initial={initial} />
    </div>
  )
}
