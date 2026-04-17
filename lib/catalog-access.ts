import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

export async function requireCatalogManager(businessSlug: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("Forbidden")
  }
  return ctx
}

/** Any org member (including cashier) for read-only catalog / POS prep. */
export async function requireCatalogMember(businessSlug: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")
  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx) throw new Error("Forbidden")
  return ctx
}
