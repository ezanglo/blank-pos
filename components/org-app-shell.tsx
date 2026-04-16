"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export type OrgAppShellUser = {
  name: string
  email: string
  image?: string | null
  brandName: string
  orgRole: string
}

export function OrgAppShell({
  orgSlug,
  storeName,
  locationName,
  logoImageUrl,
  user,
  children,
}: {
  orgSlug: string
  storeName: string
  locationName: string
  logoImageUrl?: string | null
  user: OrgAppShellUser
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      className="h-dvh max-h-dvh min-h-0 overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        orgSlug={orgSlug}
        locations={[
          {
            storeName,
            locationName,
            logoUrl: logoImageUrl,
          },
        ]}
        user={{
          name: user.name,
          email: user.email,
          avatar: user.image ?? "",
          brandName: user.brandName,
          orgRole: user.orgRole,
        }}
      />
      <SidebarInset className="min-h-0 flex-1 overflow-hidden">
        <SiteHeader orgSlug={orgSlug} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
          <div className="@container/main flex flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
