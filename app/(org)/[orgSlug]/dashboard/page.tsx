import { notFound } from "next/navigation"

import { parseOrgMetadata } from "@/lib/org-metadata"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await getServerSession()
  if (!session?.user?.id) notFound()

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) notFound()

  const meta = parseOrgMetadata(ctx.organization.metadata)
  const display = ctx.branding?.displayName?.trim() || ctx.organization.name

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as <span className="text-foreground font-medium">{session.user.name}</span> (
        {ctx.member.role})
      </p>
      <div className="rounded-xl border p-4 text-sm">
        <p className="font-medium">{display}</p>
        {meta.defaultCurrency ? (
          <p className="text-muted-foreground mt-1">Default currency: {meta.defaultCurrency}</p>
        ) : null}
        {meta.phone ? <p className="text-muted-foreground mt-1">Phone: {meta.phone}</p> : null}
        {meta.addressLine1 ? (
          <p className="text-muted-foreground mt-1">{meta.addressLine1}</p>
        ) : null}
      </div>
    </div>
  )
}
