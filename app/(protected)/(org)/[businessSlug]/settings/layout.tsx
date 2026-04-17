import { OrgAppShellLoader } from "@/components/org-app-shell-loader"

export const dynamic = "force-dynamic"

export default async function BusinessSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  return (
    <OrgAppShellLoader businessSlug={businessSlug} locationSlug={null} showLocationSwitcher={false}>
      <div className="space-y-6">{children}</div>
    </OrgAppShellLoader>
  )
}
