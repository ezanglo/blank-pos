"use server"

import { APIError } from "better-auth/api"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { type OrgMetadata } from "@/lib/org-metadata"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

export async function updateOrganizationStore(
  orgSlug: string,
  input: { name: string; metadata: OrgMetadata },
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("Forbidden")
  }

  try {
    await auth.api.updateOrganization({
      headers: await headers(),
      body: {
        organizationId: ctx.organization.id,
        data: {
          name: input.name.trim(),
          metadata: input.metadata as Record<string, unknown>,
        },
      },
    })
  } catch (e) {
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  return { ok: true as const }
}
