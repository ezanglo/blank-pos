"use client"

import * as React from "react"

import { HeaderBusinessSwitcher } from "@/components/header-business-switcher"
import { HeaderLocationSwitcher } from "@/components/header-location-switcher"
import type { HeaderBranch } from "@/components/header-location-switcher"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { SidebarBusinessNavItem } from "@/lib/types/nav"

function HeaderClock() {
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const dateLine = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(now)

  const timeLine = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(now)

  return (
    <div className="min-w-0 shrink-0 text-right">
      <p className="text-muted-foreground truncate text-xs leading-tight">
        {dateLine}
      </p>
      <p className="text-foreground truncate text-sm font-medium tabular-nums leading-tight">
        {timeLine}
      </p>
    </div>
  )
}

function resolveActiveLocationName(
  branches: HeaderBranch[],
  navLocationSlug: string
) {
  const b =
    branches.find((x) => x.slug === navLocationSlug) ?? branches[0] ?? null
  return b?.name ?? null
}

export function SiteHeader({
  businessSlug,
  navLocationSlug,
  sidebarBusinesses,
  headerBranches,
  showLocationSwitcher,
  user,
}: {
  businessSlug: string
  navLocationSlug: string
  headerBranches: HeaderBranch[]
  sidebarBusinesses: SidebarBusinessNavItem[]
  showLocationSwitcher: boolean
  user: {
    name: string
    email: string
    image?: string | null
    brandName: string
    orgRole: string
  }
}) {
  const activeLocationName = resolveActiveLocationName(
    headerBranches,
    navLocationSlug
  )

  const locationSwitcherProps =
    showLocationSwitcher && headerBranches.length > 0
      ? {
          businessSlug,
          branches: headerBranches,
          activeLocationSlug: navLocationSlug,
        }
      : null

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:gap-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-foreground md:-ml-1"
        />
        <Breadcrumb
          aria-label="Workspace"
          className="flex min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <BreadcrumbList className="min-w-0 w-max max-w-full flex-nowrap items-center gap-2 overflow-x-auto sm:gap-2.5">
            <BreadcrumbItem className="min-w-0">
              <HeaderBusinessSwitcher
                businesses={sidebarBusinesses}
                activeLocationName={activeLocationName}
              />
            </BreadcrumbItem>
            {locationSwitcherProps ? (
              <>
                <BreadcrumbSeparator className="hidden items-center px-0.5 text-border select-none md:inline-flex">
                  /
                </BreadcrumbSeparator>
                <BreadcrumbItem className="hidden min-w-0 md:inline-flex">
                  <HeaderLocationSwitcher
                    {...locationSwitcherProps}
                    triggerVariant="default"
                  />
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <div className="hidden md:block">
          <HeaderClock />
        </div>
        {locationSwitcherProps ? (
          <div className="md:hidden">
            <HeaderLocationSwitcher
              {...locationSwitcherProps}
              triggerVariant="icon"
            />
          </div>
        ) : null}
        <NavUser
          variant="header"
          user={{
            name: user.name,
            email: user.email,
            avatar: user.image ?? "",
            brandName: user.brandName,
            orgRole: user.orgRole,
          }}
        />
      </div>
    </header>
  )
}
