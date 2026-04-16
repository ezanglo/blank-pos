import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { listMembersForOrganization } from "@/lib/queries/members"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

import { StaffPanel } from "@/components/settings/staff-panel"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}): Promise<Metadata> {
  const { orgSlug } = await params
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { title: "Staff" }
  }
  const ctx = await getOrgForUser(orgSlug, session.user.id)
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
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await getServerSession()
  if (!session?.user?.id) notFound()

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) notFound()
  if (ctx.member.role !== "owner" && ctx.member.role !== "manager") notFound()

  const members = await listMembersForOrganization(ctx.organization.id)

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
      <StaffPanel
        orgSlug={orgSlug}
        organizationId={ctx.organization.id}
        currentUserId={session.user.id}
        currentRole={ctx.member.role}
        members={members}
      />
    </div>
  )
}
