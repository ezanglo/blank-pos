"use client"

import Link from "next/link"

import { GalleryVerticalEndIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

export function OrgHeader({
  orgSlug,
  locationName,
  logoImageUrl,
}: {
  orgSlug: string
  /** This location’s name (`organization.name`). */
  locationName: string
  logoImageUrl?: string | null
}) {
  const prefix = `/${orgSlug}`
  const logo = logoImageUrl?.trim() || null

  async function onSignOut() {
    await authClient.signOut()
    window.location.href = "/login"
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Link
          href={`${prefix}/dashboard`}
          className={cn("flex min-w-0 max-w-[220px] items-center gap-2 font-medium")}
        >
          {logo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- site branding HTTPS URL */}
              <img
                src={logo}
                alt=""
                className="size-8 shrink-0 rounded-md border bg-card object-contain p-0.5"
              />
              <span className="truncate">{locationName}</span>
            </>
          ) : (
            <>
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                <GalleryVerticalEndIcon className="size-4" />
              </span>
              <span className="truncate">{locationName}</span>
            </>
          )}
        </Link>
        <nav className="text-muted-foreground flex flex-wrap gap-3 text-sm">
          <Link href={`${prefix}/dashboard`} className="hover:text-foreground">
            Dashboard
          </Link>
          <Link href={`${prefix}/settings/store`} className="hover:text-foreground">
            Location
          </Link>
          <Link href="/settings/branding" className="hover:text-foreground">
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
