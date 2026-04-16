import { notFound } from "next/navigation"

import { listMembersForOrganization } from "@/lib/queries/members"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

import { StaffPanel } from "./staff-panel"

export const dynamic = "force-dynamic"

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="text-muted-foreground text-sm">
          Create sign-ins with username and password. No email invites.
        </p>
      </div>
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
