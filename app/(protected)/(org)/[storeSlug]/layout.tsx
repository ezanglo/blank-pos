import { notFound } from "next/navigation"

import { getOrgForUser } from "@/lib/queries/organization"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function StoreGateLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ storeSlug: string }>
}) {
  const { storeSlug } = await params
  const session = await requireSession()
  const ctx = await getOrgForUser(storeSlug, session.user.id)
  if (!ctx) notFound()
  return children
}
