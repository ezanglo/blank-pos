import { notFound, redirect } from "next/navigation"

import { getDefaultLocationSlugForOrganization } from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function BusinessIndexPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  const loc = await getDefaultLocationSlugForOrganization(ctx.organization.id)
  if (!loc) notFound()
  redirect(`/${businessSlug}/l/${loc}/dashboard`)
}
