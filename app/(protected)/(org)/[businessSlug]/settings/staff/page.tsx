import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { StaffPanel } from "@/components/settings/staff-panel"
import { listMembersForOrganization } from "@/lib/queries/members"
import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}): Promise<Metadata> {
  const { businessSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) {
    return { title: "Staff" }
  }
  return {
    title: `Staff · ${ctx.organization.name}`,
    description: `Manage team members and roles for ${ctx.organization.name}.`,
  }
}

export default async function StaffSettingsPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const members = await listMembersForOrganization(ctx.organization.id)

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
      <StaffPanel
        businessSlug={businessSlug}
        organizationId={ctx.organization.id}
        currentUserId={session.user.id}
        currentRole={ctx.member.role}
        members={members}
      />
    </div>
  )
}
