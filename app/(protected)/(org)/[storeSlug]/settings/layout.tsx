import { OrgAppShellLoader } from "@/components/org-app-shell-loader"

export const dynamic = "force-dynamic"

export default async function StoreSettingsBranchLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  return (
    <OrgAppShellLoader storeSlug={storeSlug} locationSlug={null} showLocationSwitcher={false}>
      <div className="space-y-6">{children}</div>
    </OrgAppShellLoader>
  )
}
