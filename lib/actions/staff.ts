"use server"

import { APIError } from "better-auth/api"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { member, user } from "@/lib/db/schema"
import { logAuthEvent } from "@/lib/log-server"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

async function getMembership(organizationId: string, userId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  return row ?? null
}

async function getUserByEmail(email: string) {
  const db = getDb()
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  return row ?? null
}

export async function staffCreateUser(input: {
  organizationId: string
  email: string
  password?: string
  name?: string
  role: "manager" | "cashier"
}) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const actor = await getMembership(input.organizationId, session.user.id)
  if (!actor || (actor.role !== "owner" && actor.role !== "manager")) {
    throw new Error("You do not have permission to manage the team.")
  }

  if (input.role === "manager" && actor.role !== "owner") {
    throw new Error("Only the owner can create managers.")
  }

  const email = input.email.trim().toLowerCase()
  if (!email.includes("@")) throw new Error("Enter a valid email.")
  const password = input.password?.trim() ?? ""
  const name = input.name?.trim() ?? ""

  let newUserId: string
  try {
    if (!password) throw new Error("MISSING_PASSWORD_FOR_NEW_USER")
    if (password.length < 8) throw new Error("Password must be at least 8 characters.")
    if (!name) throw new Error("Display name is required for new users.")
    const res = await auth.api.createUser({
      body: {
        email,
        password,
        name,
      },
    })
    const user = (res as { user?: { id: string } }).user
    if (!user?.id) throw new Error("Failed to create user")
    newUserId = user.id
  } catch (e) {
    const existing = await getUserByEmail(email)
    if (existing?.id) {
      newUserId = existing.id
    } else if (e instanceof Error && e.message === "MISSING_PASSWORD_FOR_NEW_USER") {
      throw new Error("Temporary password is required when creating a new user.")
    } else {
      logAuthEvent("error", "staff.create_user_failed", {
        organizationId: input.organizationId,
        email,
        message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
      })
      if (e instanceof APIError) throw new Error(e.message)
      throw e
    }
  }

  const existingMember = await getMembership(input.organizationId, newUserId)
  if (existingMember) {
    throw new Error("This user is already a member of this team.")
  }

  try {
    await auth.api.addMember({
      headers: await headers(),
      body: {
        organizationId: input.organizationId,
        userId: newUserId,
        role: input.role,
      },
    })
  } catch (e) {
    logAuthEvent("error", "staff.add_member_failed", {
      organizationId: input.organizationId,
      email,
      newUserId,
      message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
    })
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  return { ok: true as const }
}

export async function staffUpdateMemberRole(
  businessSlug: string,
  memberId: string,
  role: "manager" | "cashier",
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("You do not have permission to manage the team.")
  }

  if (role === "manager" && ctx.member.role !== "owner") {
    throw new Error("Only the owner can assign the manager role.")
  }

  const db = getDb()
  const [target] = await db
    .select()
    .from(member)
    .where(and(eq(member.id, memberId), eq(member.organizationId, ctx.organization.id)))
    .limit(1)
  if (!target) throw new Error("Member not found.")

  if (target.userId === session.user.id) {
    throw new Error("You cannot change your own role here.")
  }
  if (target.role === "owner") {
    throw new Error("The store owner role cannot be changed here.")
  }
  if (target.role === "manager" && ctx.member.role !== "owner") {
    throw new Error("Only the owner can change a manager’s role.")
  }

  try {
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: {
        memberId,
        role,
        organizationId: ctx.organization.id,
      },
    })
  } catch (e) {
    logAuthEvent("error", "staff.update_member_role_failed", {
      organizationId: ctx.organization.id,
      businessSlug,
      memberId,
      message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
    })
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  return { ok: true as const }
}

export async function staffRemoveMember(businessSlug: string, memberId: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(businessSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("You do not have permission to manage the team.")
  }

  const db = getDb()
  const [target] = await db
    .select()
    .from(member)
    .where(and(eq(member.id, memberId), eq(member.organizationId, ctx.organization.id)))
    .limit(1)
  if (!target) throw new Error("Member not found.")

  if (target.userId === session.user.id) {
    throw new Error("You cannot remove yourself.")
  }
  if (target.role === "owner") {
    throw new Error("The store owner cannot be removed here.")
  }
  if (target.role === "manager" && ctx.member.role !== "owner") {
    throw new Error("Only the owner can remove managers.")
  }

  try {
    await auth.api.removeMember({
      headers: await headers(),
      body: {
        memberIdOrEmail: memberId,
        organizationId: ctx.organization.id,
      },
    })
  } catch (e) {
    logAuthEvent("error", "staff.remove_member_failed", {
      organizationId: ctx.organization.id,
      businessSlug,
      memberId,
      message: e instanceof APIError ? e.message : e instanceof Error ? e.message : "unknown",
    })
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  return { ok: true as const }
}
