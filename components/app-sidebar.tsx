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
  BanknoteIcon,
  BoxesIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  ReceiptTextIcon,
  PackageIcon,
  SettingsIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

export function AppSidebar({
  businessSlug,
  navLocationSlug,
  orgRole,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  businessSlug: string
  navLocationSlug: string
  orgRole: string
}) {
  const pathname = usePathname()

  const base = `/${businessSlug}`
  const locBase = `${base}/l/${navLocationSlug}`
  const dashboardHref = `${locBase}/dashboard`
  const dashboardActive =
    pathname === dashboardHref || pathname.startsWith(`${dashboardHref}/`)
  const posHref = `${locBase}/pos`
  const posActive = pathname === posHref || pathname.startsWith(`${posHref}/`)
  const transactionsHref = `${locBase}/transactions`
  const transactionsActive =
    pathname === transactionsHref || pathname.startsWith(`${transactionsHref}/`)
  const productSalesHref = `${locBase}/product-sales`
  const productSalesActive =
    pathname === productSalesHref || pathname.startsWith(`${productSalesHref}/`)

  const isCashier = orgRole === "cashier"

  type NavItem = { title: string; url: string; icon: React.ReactNode }

  const catalogItems: NavItem[] = [
    {
      title: "Categories",
      url: `${base}/catalog/categories`,
      icon: <TagIcon className="size-4" />,
    },
    {
      title: "Products",
      url: `${base}/catalog/products`,
      icon: <PackageIcon className="size-4" />,
    },
    {
      title: "Inventory",
      url: `${base}/catalog/inventory`,
      icon: <BoxesIcon className="size-4" />,
    },
  ]

  const businessItems: NavItem[] = [
    {
      title: "Locations",
      url: `${base}/business/locations`,
      icon: <MapPinIcon className="size-4" />,
    },
    {
      title: "Team",
      url: `${base}/business/team`,
      icon: <UsersIcon className="size-4" />,
    },
    {
      title: "Settings",
      url: `${base}/business/settings`,
      icon: <SettingsIcon className="size-4" />,
    },
  ]

  const navGroups: { label: string; items: NavItem[] }[] = isCashier
    ? []
    : [
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Register"
                  isActive={posActive}
                  render={<Link href={posHref} />}
                >
                  <BanknoteIcon />
                  <span>Register</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {!isCashier ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Transactions"
                      isActive={transactionsActive}
                      render={<Link href={transactionsHref} />}
                    >
                      <ReceiptTextIcon />
                      <span>Transactions</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Product Sales"
                      isActive={productSalesActive}
                      render={<Link href={productSalesHref} />}
                    >
                      <TrendingUpIcon />
                      <span>Product Sales</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : null}
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
