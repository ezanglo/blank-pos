import { redirect } from "next/navigation"

import {
  getDashboardPathForUser,
  userNeedsLocationChoice,
  userNeedsOnboarding,
} from "@/lib/dashboard-path"
import { requireSession } from "@/lib/server-auth"
import { getUserCount } from "@/lib/user-count"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const n = await getUserCount()
  if (n === 0) redirect("/signup")

  const session = await requireSession()

  if (await userNeedsLocationChoice(session.user.id)) {
    redirect("/choose-location")
  }

  const path = await getDashboardPathForUser(
    session.user.id,
    session.session.activeOrganizationId,
  )
  if (path) redirect(path)
  if (await userNeedsOnboarding(session.user.id, session.session.activeOrganizationId)) {
    redirect("/onboarding")
  }
  redirect("/login")
}
