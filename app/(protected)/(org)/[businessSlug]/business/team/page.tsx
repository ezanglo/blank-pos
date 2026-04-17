import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { StaffAdminPanel, type StaffMemberRow } from "@/components/settings/staff-admin-panel"
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
    return { title: "Team" }
  }
  return {
    title: `Team · ${ctx.organization.name}`,
    description: `Manage team members and roles for ${ctx.organization.name}.`,
  }
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const session = await requireSession()

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const membersRaw = await listMembersForOrganization(ctx.organization.id)
  const members: StaffMemberRow[] = membersRaw.map((m) => ({
    memberId: m.memberId,
    userId: m.userId,
    role: m.role,
    name: m.name,
    email: m.email,
    joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : String(m.joinedAt),
  }))

  return (
    <StaffAdminPanel
      businessSlug={businessSlug}
      organizationId={ctx.organization.id}
      currentUserId={session.user.id}
      currentRole={ctx.member.role}
      members={members}
    />
  )
}
