"use server"

import {
  getDashboardPathForUser,
  userShouldContinueSetupWizard,
} from "@/lib/dashboard-path"
import { getServerSession } from "@/lib/server-auth"

/** Used after sign-in to land in the correct org dashboard. */
export async function getPostLoginRedirect(): Promise<string> {
  const s = await getServerSession()
  if (!s?.user?.id || !s.session) return "/login"
  const path = await getDashboardPathForUser(s.user.id, s.session.activeOrganizationId)
  if (path) return path
  if (await userShouldContinueSetupWizard(s.user.id, s.session.activeOrganizationId)) {
    return "/setup"
  }
  return "/login"
}
