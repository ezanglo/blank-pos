"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"
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
import type { SidebarBusinessNavItem } from "@/lib/types/nav"
import { ChevronDownIcon, StoreIcon } from "lucide-react"

function BusinessMark({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="size-full object-cover" />
  }
  return <StoreIcon className="size-4" />
}

export function BusinessSwitcher({ businesses }: { businesses: SidebarBusinessNavItem[] }) {
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
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <BusinessMark logoUrl={active.logoUrl} />
            </div>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{active.label}</span>
              <span className="text-muted-foreground truncate text-xs">Business</span>
            </div>
            <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Businesses</DropdownMenuLabel>
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
                    <span className="text-muted-foreground truncate text-xs">/{b.slug}</span>
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
