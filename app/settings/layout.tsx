import { redirect } from "next/navigation"

import { getServerSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")

  return <div className="bg-background min-h-dvh px-4 py-8">{children}</div>
}
