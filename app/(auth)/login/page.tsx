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

  return <LoginForm />
}
