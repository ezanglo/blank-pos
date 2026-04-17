import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getPostLoginRedirect } from "@/lib/actions/nav"
import { LoginForm } from "@/components/login-form"
import { getServerSession } from "@/lib/server-auth"
import { GalleryVerticalEndIcon } from "lucide-react"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Blank POS with your staff username and password.",
}

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const session = await getServerSession()
  if (session?.user?.id) {
    const next = await getPostLoginRedirect()
    if (next !== "/login") redirect(next)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3 self-center text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GalleryVerticalEndIcon className="size-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Blank POS</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Staff sign-in for your store workspace
            </p>
          </div>
        </div>
        <LoginForm className="relative w-full max-w-md" />
      </div>
    </div>
  )
}
