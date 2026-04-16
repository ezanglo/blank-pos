"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  LocationSwitcher,
  type SidebarLocation,
} from "@/components/location-switcher"
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
import { LayoutDashboardIcon, StoreIcon, UsersIcon } from "lucide-react"

// Demo data when the shell does not pass org props (e.g. `/dashboard`).
const defaultLocations: SidebarLocation[] = [
  {
    storeName: "Demo Store",
    locationName: "Main floor",
    logo: <StoreIcon className="size-4" />,
  },
  {
    storeName: "Demo Store",
    locationName: "Pop-up kiosk",
    logo: <StoreIcon className="size-4" />,
  },
]

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
}

export type AppSidebarUser = {
  name: string
  email: string
  avatar: string
  brandName?: string
  orgRole?: string
}

export function AppSidebar({
  orgSlug,
  locations,
  user: userProp,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  orgSlug?: string
  locations?: SidebarLocation[]
  user?: AppSidebarUser
}) {
  const pathname = usePathname()
  const locationsResolved = locations?.length ? locations : defaultLocations
  const user = userProp ?? data.user

  const basePath = orgSlug ? `/${orgSlug}` : null
  const dashboardHref = basePath ? `${basePath}/dashboard` : "#"
  const dashboardActive =
    !!basePath &&
    (pathname === dashboardHref || pathname.startsWith(`${dashboardHref}/`))

  const adminNav =
    basePath === null
      ? []
      : [
          {
            title: "Location",
            url: `${basePath}/settings/store`,
            icon: <StoreIcon className="size-4" />,
          },
          {
            title: "Staff",
            url: `${basePath}/settings/staff`,
            icon: <UsersIcon className="size-4" />,
          },
        ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <LocationSwitcher locations={locationsResolved} />
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

        <NavSecondary
          title="Administration"
          items={adminNav}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
