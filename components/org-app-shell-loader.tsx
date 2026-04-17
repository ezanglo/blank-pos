import { notFound } from "next/navigation"

import { OrgAppShell } from "@/components/org-app-shell"
import { resolveBrandColorToCss } from "@/lib/brand-color"
import { loadOrgShellData } from "@/lib/org-shell"
import { requireSession } from "@/lib/server-auth"

export async function OrgAppShellLoader({
  businessSlug,
  locationSlug,
  showLocationSwitcher,
  children,
}: {
  businessSlug: string
  locationSlug: string | null
  showLocationSwitcher: boolean
  children: React.ReactNode
}) {
  const session = await requireSession()
  const data = await loadOrgShellData(businessSlug, session.user.id, locationSlug)
  if (!data) notFound()

  const navLocationSlug = locationSlug ?? data.defaultLocationSlug
  const branches = data.locations.map((l) => ({ slug: l.slug, name: l.name }))
  const brandPrimaryCss = resolveBrandColorToCss(data.businessDetails?.primaryColor ?? null)
  const brandAccentCss = resolveBrandColorToCss(data.businessDetails?.accentColor ?? null)
  const shellDisplayName = data.businessDetails?.displayName?.trim() || data.organizationName

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <OrgAppShell
        businessSlug={data.businessSlug}
        navLocationSlug={navLocationSlug}
        sidebarBusinesses={data.sidebarBusinesses}
        headerBranches={branches}
        brandPrimaryCss={brandPrimaryCss}
        brandAccentCss={brandAccentCss}
        showLocationSwitcher={showLocationSwitcher}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          brandName: shellDisplayName,
          orgRole: data.memberRole,
        }}
      >
        {children}
      </OrgAppShell>
    </div>
  )
}
