"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function OrgHeader({ orgSlug, storeName }: { orgSlug: string; storeName: string }) {
  const prefix = `/${orgSlug}`

  async function onSignOut() {
    await authClient.signOut()
    window.location.href = "/login"
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Link href={`${prefix}/dashboard`} className="truncate font-medium">
          {storeName}
        </Link>
        <nav className="text-muted-foreground flex flex-wrap gap-3 text-sm">
          <Link href={`${prefix}/dashboard`} className="hover:text-foreground">
            Dashboard
          </Link>
          <Link href={`${prefix}/settings/store`} className="hover:text-foreground">
            Store
          </Link>
          <Link href={`${prefix}/settings/branding`} className="hover:text-foreground">
            Branding
          </Link>
          <Link href={`${prefix}/settings/staff`} className="hover:text-foreground">
            Staff
          </Link>
        </nav>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onSignOut}>
        Sign out
      </Button>
    </header>
  )
}
