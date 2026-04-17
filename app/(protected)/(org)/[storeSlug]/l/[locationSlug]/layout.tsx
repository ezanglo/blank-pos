import { OrgAppShellLoader } from "@/components/org-app-shell-loader"

export const dynamic = "force-dynamic"

export default async function LocationShellLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ storeSlug: string; locationSlug: string }>
}) {
  const { storeSlug, locationSlug } = await params
  return (
    <OrgAppShellLoader storeSlug={storeSlug} locationSlug={locationSlug} showLocationSwitcher>
      {children}
    </OrgAppShellLoader>
  )
}
