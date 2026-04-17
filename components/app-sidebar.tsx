"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  BoxesIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  PackageIcon,
  SettingsIcon,
  TagIcon,
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

  type NavItem = { title: string; url: string; icon: React.ReactNode }

  const catalogItems: NavItem[] = [
    {
      title: "Categories",
      url: `${base}/settings/categories`,
      icon: <TagIcon className="size-4" />,
    },
    {
      title: "Products",
      url: `${base}/settings/products`,
      icon: <PackageIcon className="size-4" />,
    },
    {
      title: "Inventory",
      url: `${base}/settings/inventory`,
      icon: <BoxesIcon className="size-4" />,
    },
  ]

  const businessItems: NavItem[] = [
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
      title: "Settings",
      url: `${base}/settings/business`,
      icon: <SettingsIcon className="size-4" />,
    },
  ]

  const navGroups: { label: string; items: NavItem[] }[] = [
    { label: "Catalog", items: catalogItems },
    { label: "Business", items: businessItems },
  ]

  function itemActive(url: string) {
    return pathname === url || pathname.startsWith(`${url}/`)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
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

        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={itemActive(item.url)}
                      render={<Link href={item.url} />}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
