import { notFound } from "next/navigation"

import { OrgAppShell } from "@/components/org-app-shell"
import { resolveBrandColorToCss } from "@/lib/brand-color"
import { getOrgForUser } from "@/lib/queries/organization"
import { getStoreBranding } from "@/lib/queries/store-branding"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) notFound()

  const site = await getStoreBranding()
  const storeName = site?.displayName?.trim() || "Store"
  const locationName = ctx.organization.name
  const logoImageUrl = site?.logoImageUrl ?? null
  const brandPrimaryCss = resolveBrandColorToCss(site?.primaryColor ?? null)
  const brandAccentCss = resolveBrandColorToCss(site?.accentColor ?? null)

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <OrgAppShell
        orgSlug={orgSlug}
        storeName={storeName}
        locationName={locationName}
        logoImageUrl={logoImageUrl}
        brandPrimaryCss={brandPrimaryCss}
        brandAccentCss={brandAccentCss}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          brandName: storeName,
          orgRole: ctx.member.role,
        }}
      >
        {children}
      </OrgAppShell>
    </div>
  )
}
