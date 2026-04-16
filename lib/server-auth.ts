import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth } from "@/lib/auth"

export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

export async function requireSession() {
  const session = await getServerSession()
  if (!session?.user?.id || !session.session) {
    redirect("/login")
  }
  return session
}
