"use server"

import { APIError } from "better-auth/api"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { member } from "@/lib/db/schema"
import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

function internalEmail(username: string) {
  return `${username.toLowerCase()}@users.blankpos.local`
}

async function getMembership(organizationId: string, userId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
  return row ?? null
}

export async function staffCreateUser(input: {
  organizationId: string
  username: string
  password: string
  name: string
  role: "manager" | "cashier"
}) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const actor = await getMembership(input.organizationId, session.user.id)
  if (!actor || (actor.role !== "owner" && actor.role !== "manager")) {
    throw new Error("You do not have permission to manage staff.")
  }

  if (input.role === "manager" && actor.role !== "owner") {
    throw new Error("Only the owner can create managers.")
  }

  const username = input.username.trim().toLowerCase()
  if (username.length < 2) throw new Error("Username is too short.")
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.")

  let newUserId: string
  try {
    const res = await auth.api.createUser({
      body: {
        email: internalEmail(username),
        password: input.password,
        name: input.name.trim(),
        data: { username, displayUsername: username },
      },
    })
    const user = (res as { user?: { id: string } }).user
    if (!user?.id) throw new Error("Failed to create user")
    newUserId = user.id
  } catch (e) {
    if (e instanceof APIError) throw new Error(e.message)
    throw e
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
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  return { ok: true as const }
}

export async function staffRemoveMember(orgSlug: string, memberId: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error("Unauthorized")

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx || (ctx.member.role !== "owner" && ctx.member.role !== "manager")) {
    throw new Error("You do not have permission to manage staff.")
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
    if (e instanceof APIError) throw new Error(e.message)
    throw e
  }

  return { ok: true as const }
}
