"use client"

import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import Image from "next/image"

import { authClient } from "@/lib/auth-client"
import type { SidebarBusinessNavItem } from "@/lib/types/nav"
import { cn } from "@/lib/utils"
import { ChevronDownIcon, StoreIcon } from "lucide-react"

export function BusinessMark({
  logoUrl,
  fallbackIconClassName,
}: {
  logoUrl?: string | null
  /** Applied to the default store icon when there is no logo. */
  fallbackIconClassName?: string
}) {
  if (logoUrl) {
    return (
      <div className="relative size-full">
        <Image src={logoUrl} alt="" fill className="object-cover" sizes="40px" referrerPolicy="no-referrer" />
      </div>
    )
  }
  return <StoreIcon className={cn("size-4", fallbackIconClassName)} />
}

export function BusinessSwitcher({
  businesses,
}: {
  businesses: SidebarBusinessNavItem[]
}) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const activeSlug = React.useMemo(() => {
    const m = pathname.match(/^\/([^/]+)/)
    return m?.[1] ?? businesses[0]?.slug
  }, [pathname, businesses])

  const active = businesses.find((s) => s.slug === activeSlug) ?? businesses[0]
  if (!active) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="default"
                className="h-9 py-2 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-transparent text-muted-foreground">
              <BusinessMark logoUrl={active.logoUrl} />
            </div>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {active.label}
            </span>
            <ChevronDownIcon
              className="ml-auto size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Businesses
              </DropdownMenuLabel>
              {businesses.map((b) => (
                <DropdownMenuItem
                  key={b.slug}
                  className="gap-2 p-2"
                  onClick={async () => {
                    await authClient.organization.setActive({
                      organizationId: b.organizationId,
                    })
                    router.push(b.dashboardHref)
                    router.refresh()
                  }}
                >
                  <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                    <BusinessMark logoUrl={b.logoUrl} />
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{b.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      /{b.slug}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
