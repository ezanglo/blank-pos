import { notFound, redirect } from "next/navigation"

import { getDefaultLocationSlugForOrganization } from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function StoreIndexPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(storeSlug, session.user.id)
  if (!ctx) notFound()
  const loc = await getDefaultLocationSlugForOrganization(ctx.organization.id)
  if (!loc) notFound()
  redirect(`/${storeSlug}/l/${loc}/dashboard`)
}
