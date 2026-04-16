import { redirect } from "next/navigation"

import { getDashboardPathForUser } from "@/lib/dashboard-path"
import { requireSession } from "@/lib/server-auth"
import { getUserCount } from "@/lib/user-count"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const n = await getUserCount()
  if (n === 0) redirect("/setup")

  const session = await requireSession()

  const path = await getDashboardPathForUser(
    session.user.id,
    session.session.activeOrganizationId
  )
  if (path) redirect(path)
  redirect("/login")
}
