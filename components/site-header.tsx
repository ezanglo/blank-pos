"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

function titleForPath(pathname: string, businessSlug: string) {
  const locPrefix = `/${businessSlug}/l/`
  const locIdx = pathname.indexOf(locPrefix)
  const afterLoc = locIdx === -1 ? "" : pathname.slice(locIdx + locPrefix.length)
  const locSlash = afterLoc.indexOf("/")
  const tail = locSlash === -1 ? "" : afterLoc.slice(locSlash)

  if (pathname.includes(`${locPrefix}`) && (tail === "/dashboard" || tail === "")) {
    return "Dashboard"
  }
  if (pathname.includes("/settings/store")) return "Location"
  if (pathname.includes("/settings/locations")) return "Locations"
  if (pathname.includes("/settings/staff")) return "Team"
  if (pathname.includes("/settings/business")) return "Business settings"
  if (pathname.includes("/settings/branding")) return "Business settings"
  return "Blank POS"
}

export function SiteHeader({
  businessSlug,
  locationSwitcher,
}: {
  businessSlug: string
  locationSwitcher: React.ReactNode
}) {
  const pathname = usePathname()
  const title = titleForPath(pathname, businessSlug)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
        <h1 className="min-w-0 flex-1 truncate text-base font-medium">{title}</h1>
        {locationSwitcher ? <div className="ml-auto flex shrink-0 items-center gap-2">{locationSwitcher}</div> : null}
      </div>
    </header>
  )
}
