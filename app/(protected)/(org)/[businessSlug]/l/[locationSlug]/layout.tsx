import { OrgAppShellLoader } from "@/components/org-app-shell-loader"

export const dynamic = "force-dynamic"

export default async function LocationShellLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ businessSlug: string; locationSlug: string }>
}) {
  const { businessSlug, locationSlug } = await params
  return (
    <OrgAppShellLoader businessSlug={businessSlug} locationSlug={locationSlug} showLocationSwitcher>
      {children}
    </OrgAppShellLoader>
  )
}
