"use server"

import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { userProfile } from "@/lib/db/schema-app"
import { getServerSession } from "@/lib/server-auth"

function trimToNull(s: string | null | undefined) {
  const t = s?.trim()
  return t === "" || t == null ? null : t
}

export async function upsertUserProfile(input: {
  phone?: string | null
  preferredLocale?: string | null
  howHeard?: string | null
  primaryGoal?: string | null
}) {
  const session = await getServerSession()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const userId = session.user.id
  const now = new Date()
  const row = {
    phone: trimToNull(input.phone),
    preferredLocale: trimToNull(input.preferredLocale),
    howHeard: trimToNull(input.howHeard),
    primaryGoal: trimToNull(input.primaryGoal),
    updatedAt: now,
  }

  const db = getDb()
  await db
    .insert(userProfile)
    .values({ userId, ...row })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: row,
    })

  return { ok: true as const }
}

export async function getUserProfileForSession() {
  const session = await getServerSession()
  if (!session?.user?.id) return null
  const db = getDb()
  const [row] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, session.user.id))
    .limit(1)
  return row ?? null
}
