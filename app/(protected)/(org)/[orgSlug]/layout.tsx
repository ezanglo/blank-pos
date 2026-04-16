import { notFound } from "next/navigation"

import { getOrgForUser } from "@/lib/queries/organization"
import { getStoreBranding } from "@/lib/queries/store-branding"
import { requireSession } from "@/lib/server-auth"

import { OrgHeader } from "@/components/org-header"

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
  const locationName = ctx.organization.name
  const logoImageUrl = site?.logoImageUrl ?? null

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <OrgHeader orgSlug={orgSlug} locationName={locationName} logoImageUrl={logoImageUrl} />
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
