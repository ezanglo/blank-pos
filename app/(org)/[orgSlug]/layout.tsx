import { notFound, redirect } from "next/navigation"

import { getOrgForUser } from "@/lib/queries/organization"
import { getServerSession } from "@/lib/server-auth"

import { OrgHeader } from "./org-header"

export const dynamic = "force-dynamic"

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const session = await getServerSession()
  if (!session?.user?.id) redirect("/login")

  const ctx = await getOrgForUser(orgSlug, session.user.id)
  if (!ctx) notFound()

  const primary = ctx.branding?.primaryColor ?? "#171717"
  const accent = ctx.branding?.accentColor ?? "#404040"
  const storeName = ctx.branding?.displayName?.trim() || ctx.organization.name

  return (
    <div
      className="bg-background text-foreground min-h-dvh"
      style={
        {
          "--brand-primary": primary,
          "--brand-accent": accent,
        } as React.CSSProperties
      }
    >
      <OrgHeader orgSlug={orgSlug} storeName={storeName} />
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
