"use client"

import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import {
  BadgeCheckIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

function formatOrgRole(role: string) {
  const r = role.trim()
  if (!r) return ""
  return r
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function accountSubtitle(user: {
  email: string
  brandName?: string
  orgRole?: string
}) {
  const brand = user.brandName?.trim()
  const roleKey = user.orgRole?.trim()
  if (brand && roleKey) {
    return `${brand} ${formatOrgRole(roleKey)}`
  }
  return user.email
}

function NavUserThemePicker() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const active: "light" | "dark" | "system" =
    !mounted
      ? "system"
      : theme === "light" || theme === "dark" || theme === "system"
        ? theme
        : "system"

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="px-3 py-2 text-xs font-medium text-muted-foreground">
        Theme
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        className="grid grid-cols-3 gap-1 px-1.5 pb-2 **:data-[slot=dropdown-menu-radio-item-indicator]:hidden"
        value={active}
        onValueChange={(v) => setTheme(v)}
      >
        <DropdownMenuRadioItem
          value="light"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl border border-transparent py-3 px-2 text-center font-normal",
            active === "light" && "border-primary/35 bg-primary/10"
          )}
        >
          <SunIcon className="size-4 opacity-90" aria-hidden />
          <span className="text-xs">Light</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem
          value="dark"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl border border-transparent py-3 px-2 text-center font-normal",
            active === "dark" && "border-primary/35 bg-primary/10"
          )}
        >
          <MoonIcon className="size-4 opacity-90" aria-hidden />
          <span className="text-xs">Dark</span>
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem
          value="system"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl border border-transparent py-3 px-2 text-center font-normal",
            active === "system" && "border-primary/35 bg-primary/10"
          )}
        >
          <MonitorIcon className="size-4 opacity-90" aria-hidden />
          <span className="text-xs">System</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  )
}

function initialsFromName(name: string, email: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts.at(-1)!.charAt(0)}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (parts[0]?.[0]) return parts[0].charAt(0).toUpperCase()
  const e = email.trim()
  return e[0]?.toUpperCase() ?? "?"
}

export type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
    brandName?: string
    orgRole?: string
  }
  /** `header`: avatar-only trigger in app bar. `sidebar`: full-width footer control (default). */
  variant?: "sidebar" | "header"
}

export function NavUser({ user, variant = "sidebar" }: NavUserProps) {
  const { isMobile } = useSidebar()
  const subtitle = accountSubtitle(user)
  const [signingOut, setSigningOut] = React.useState(false)
  const initials = initialsFromName(user.name, user.email)
  const isHeader = variant === "header"

  async function onSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut()
      window.location.assign("/login")
    } catch {
      setSigningOut(false)
    }
  }

  const menu = (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-9">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
        </DropdownMenuLabel>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <NavUserThemePicker />
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <BadgeCheckIcon />
          Account
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        disabled={signingOut}
        onClick={() => {
          void onSignOut()
        }}
      >
        <LogOutIcon />
        {signingOut ? "Signing out…" : "Log out"}
      </DropdownMenuItem>
    </>
  )

  if (isHeader) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label="Account menu"
            />
          }
        >
          <Avatar className="size-8 after:border-0">
            <AvatarImage src={user.avatar} alt="" />
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          side={isMobile ? "bottom" : "bottom"}
          align="end"
          sideOffset={4}
        >
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
