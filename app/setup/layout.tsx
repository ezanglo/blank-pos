import { redirect } from "next/navigation"

import { getUserCount } from "@/lib/user-count"

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const n = await getUserCount()
  if (n > 0) {
    redirect("/login")
  }
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">{children}</div>
    </div>
  )
}
