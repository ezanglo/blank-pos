import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getBusinessDetailsByOrganizationId } from "@/lib/queries/business-details"
import { getOrgForUser } from "@/lib/queries/organization"
import { APP_PRODUCT_NAME, buildOrgScopedMetadata } from "@/lib/seo"
import { getServerSession, requireSession } from "@/lib/server-auth"


export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}): Promise<Metadata> {
  const { businessSlug } = await params
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { title: APP_PRODUCT_NAME }
  }
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) {
    return { title: APP_PRODUCT_NAME }
  }
  const details = await getBusinessDetailsByOrganizationId(ctx.organization.id)
  return buildOrgScopedMetadata(details, ctx.organization.name)
}

export default async function BusinessGateLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  return children
}
