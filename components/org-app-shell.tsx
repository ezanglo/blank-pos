"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import type { HeaderBranch } from "@/components/header-location-switcher"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { SidebarBusinessNavItem } from "@/lib/types/nav"

export type OrgAppShellUser = {
  name: string
  email: string
  image?: string | null
  brandName: string
  orgRole: string
}

export function OrgAppShell({
  businessSlug,
  navLocationSlug,
  sidebarBusinesses,
  headerBranches,
  brandPrimaryCss,
  brandAccentCss,
  showLocationSwitcher,
  user,
  children,
}: {
  businessSlug: string
  /** Location segment used for sidebar links (active branch or default on org-only routes). */
  navLocationSlug: string
  sidebarBusinesses: SidebarBusinessNavItem[]
  headerBranches: HeaderBranch[]
  brandPrimaryCss?: string | null
  brandAccentCss?: string | null
  showLocationSwitcher: boolean
  user: OrgAppShellUser
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          ...(brandPrimaryCss ? { "--brand-primary": brandPrimaryCss } : {}),
          ...(brandAccentCss ? { "--brand-accent": brandAccentCss } : {}),
        } as React.CSSProperties
      }
    >
      <SiteHeader
        businessSlug={businessSlug}
        navLocationSlug={navLocationSlug}
        sidebarBusinesses={sidebarBusinesses}
        headerBranches={headerBranches}
        showLocationSwitcher={showLocationSwitcher}
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
          brandName: user.brandName,
          orgRole: user.orgRole,
        }}
      />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <AppSidebar
          variant="inset"
          businessSlug={businessSlug}
          navLocationSlug={navLocationSlug}
          orgRole={user.orgRole}
        />
        <SidebarInset className="min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
            <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">{children}</div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
