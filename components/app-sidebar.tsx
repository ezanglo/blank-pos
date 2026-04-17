"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  MapPinIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"

export function AppSidebar({
  businessSlug,
  navLocationSlug,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  businessSlug: string
  navLocationSlug: string
}) {
  const pathname = usePathname()

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

        <NavSecondary
          title="Administration"
          items={adminNav}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
