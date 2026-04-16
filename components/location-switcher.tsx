"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { MapPinIcon, PlusIcon, StoreIcon } from "lucide-react"

export type SidebarLocation = {
  storeName: string
  locationName: string
  logo?: React.ReactNode
  logoUrl?: string | null
}

function LocationMark({ location }: { location: SidebarLocation }) {
  if (location.logoUrl) {
    return (
      <img
        src={location.logoUrl}
        alt=""
        className="size-full object-cover"
      />
    )
  }
  if (location.logo) {
    return location.logo
  }
  return <StoreIcon className="size-4" />
}

export function LocationSwitcher({ locations }: { locations: SidebarLocation[] }) {
  const { isMobile } = useSidebar()
  const [active, setActive] = React.useState(locations[0])
  if (!active) {
    return null
  }
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
              <LocationMark location={active} />
            </div>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{active.storeName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {active.locationName}
              </span>
            </div>
            <MapPinIcon
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
                Locations
              </DropdownMenuLabel>
              {locations.map((location, index) => (
                <DropdownMenuItem
                  key={`${location.storeName}-${location.locationName}-${index}`}
                  onClick={() => setActive(location)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                    <LocationMark location={location} />
                  </div>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {location.storeName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {location.locationName}
                    </span>
                  </div>
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Add location
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
