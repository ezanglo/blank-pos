import { redirect } from "next/navigation"

import { getPostLoginRedirect } from "@/app/actions/nav"
import { getServerSession } from "@/lib/server-auth"

import { LoginForm } from "./login-form"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const session = await getServerSession()
  if (session?.user?.id) {
    const next = await getPostLoginRedirect()
    if (next !== "/login") redirect(next)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">Use your staff username and password.</p>
      </header>
      <LoginForm />
    </div>
  )
}
