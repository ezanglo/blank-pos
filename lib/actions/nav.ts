"use server"

import {
  getDashboardPathForUser,
  userNeedsLocationChoice,
  userNeedsOnboarding,
} from "@/lib/dashboard-path"
import { getServerSession } from "@/lib/server-auth"

/** Used after sign-in to land in the correct org dashboard or onboarding. */
export async function getPostLoginRedirect(): Promise<string> {
  const s = await getServerSession()
  if (!s?.user?.id || !s.session) return "/login"
  if (await userNeedsLocationChoice(s.user.id)) {
    return "/choose-location"
  }
  const path = await getDashboardPathForUser(s.user.id, s.session.activeOrganizationId)
  if (path) return path
  if (await userNeedsOnboarding(s.user.id, s.session.activeOrganizationId)) {
    return "/onboarding"
  }
  return "/login"
}

/** When a session already exists, return where `/login` should send the user (or null to stay). */
export async function getLoginRedirectIfAuthed(): Promise<string | null> {
  const s = await getServerSession()
  if (!s?.user?.id || !s.session) return null
  const next = await getPostLoginRedirect()
  return next === "/login" ? null : next
}
