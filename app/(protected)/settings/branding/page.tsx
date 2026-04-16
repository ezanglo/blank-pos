import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BrandingSettingsForm } from "@/components/settings/branding-settings-form"
import { storeBrandingRowToFormInitial } from "@/lib/branding-form-initial"
import { getStoreBranding, userCanEditStoreBranding } from "@/lib/queries/store-branding"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Branding",
  description: "Store logos, colors, display name, and shared business details.",
}

export default async function StoreBrandingSettingsPage() {
  const session = await requireSession()

  if (!(await userCanEditStoreBranding(session.user.id))) notFound()

  const b = await getStoreBranding()
  if (!b) notFound()

  const initial = storeBrandingRowToFormInitial(b)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your shared store look—logos, colors, how you describe the business, and more—applies to
          every shop. Printed ticket text is here too if you use it. To change one shop’s name, web
          link, or address, open that shop and choose Location—not this page.
        </p>
      </div>
      <BrandingSettingsForm initial={initial} />
    </div>
  )
}
