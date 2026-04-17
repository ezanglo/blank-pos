"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { BusinessSwitcher } from "@/components/business-switcher"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import type { SidebarBusinessNavItem } from "@/lib/types/nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, MapPinIcon, Settings2Icon, UsersIcon } from "lucide-react"

export type AppSidebarUser = {
  name: string
  email: string
  avatar: string
  brandName?: string
  orgRole?: string
}

export function AppSidebar({
  businessSlug,
  navLocationSlug,
  sidebarBusinesses,
  user: userProp,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  businessSlug: string
  navLocationSlug: string
  sidebarBusinesses: SidebarBusinessNavItem[]
  user?: AppSidebarUser
}) {
  const pathname = usePathname()
  const user = userProp ?? {
    name: "",
    email: "",
    avatar: "",
  }

  const base = `/${businessSlug}`
  const locBase = `${base}/l/${navLocationSlug}`
  const dashboardHref = `${locBase}/dashboard`
  const dashboardActive =
    pathname === dashboardHref || pathname.startsWith(`${dashboardHref}/`)

  const adminNav = [
    {
      title: "Locations",
      url: `${base}/settings/locations`,
      icon: <MapPinIcon className="size-4" />,
    },
    {
      title: "Team",
      url: `${base}/settings/staff`,
      icon: <UsersIcon className="size-4" />,
    },
    {
      title: "Business settings",
      url: `${base}/settings/business`,
      icon: <Settings2Icon className="size-4" />,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BusinessSwitcher businesses={sidebarBusinesses} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Dashboard"
                  isActive={dashboardActive}
                  render={<Link href={dashboardHref} />}
                >
                  <LayoutDashboardIcon />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavSecondary title="Administration" items={adminNav} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
