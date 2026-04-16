"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

function titleForPath(pathname: string, orgSlug: string) {
  const prefix = `/${orgSlug}`
  if (pathname === prefix || pathname === `${prefix}/`) return "Home"
  if (pathname.startsWith(`${prefix}/dashboard`)) return "Dashboard"
  if (pathname.startsWith(`${prefix}/settings/store`)) return "Location"
  if (pathname.startsWith(`${prefix}/settings/staff`)) return "Staff"
  return "Blank POS"
}

export function SiteHeader({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname()
  const title = titleForPath(pathname, orgSlug)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
        <h1 className="text-base font-medium">{title}</h1>
      </div>
    </header>
  )
}
