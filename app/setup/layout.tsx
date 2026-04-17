import { redirect } from "next/navigation"

import { getDashboardPathForUser, userShouldContinueSetupWizard } from "@/lib/dashboard-path"
import { getServerSession } from "@/lib/server-auth"
import { getUserCount } from "@/lib/user-count"

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const n = await getUserCount()
  if (n > 0) {
    const session = await getServerSession()
    if (!session?.user?.id || !session.session) {
      redirect("/login")
    }
    const dashboard = await getDashboardPathForUser(
      session.user.id,
      session.session.activeOrganizationId,
    )
    if (dashboard) {
      redirect(dashboard)
    }
    if (!(await userShouldContinueSetupWizard(session.user.id, session.session.activeOrganizationId))) {
      redirect("/login")
    }
  }
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">{children}</div>
    </div>
  )
}
