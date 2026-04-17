import { redirect } from "next/navigation"

import {
  getDashboardPathForUser,
  userNeedsLocationChoice,
  userNeedsOnboarding,
} from "@/lib/dashboard-path"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function ChooseLocationLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const userId = session.user.id
  if (!(await userNeedsLocationChoice(userId))) {
    const path = await getDashboardPathForUser(userId, session.session.activeOrganizationId)
    if (path) redirect(path)
    if (await userNeedsOnboarding(userId, session.session.activeOrganizationId)) {
      redirect("/onboarding")
    }
    redirect("/login")
  }

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">{children}</div>
    </div>
  )
}
