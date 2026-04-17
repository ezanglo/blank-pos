"use client"

import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  CheckIcon,
  ChevronDownIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

export type HeaderBranch = { slug: string; name: string }

/** Branch switcher for the header (current business only). */
export function HeaderLocationSwitcher({
  businessSlug,
  branches,
  activeLocationSlug,
  triggerVariant = "default",
}: {
  businessSlug: string
  branches: HeaderBranch[]
  activeLocationSlug: string | null
  /** `icon`: map pin only (no border, no chevron; for compact header). */
  triggerVariant?: "default" | "icon"
}) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const restAfterLocation = React.useMemo(() => {
    const prefix = `/${businessSlug}/l/`
    const idx = pathname.indexOf(prefix)
    if (idx === -1) return "/dashboard"
    const after = pathname.slice(idx + prefix.length)
    const slash = after.indexOf("/")
    const tail = slash === -1 ? "" : after.slice(slash)
    return tail || "/dashboard"
  }, [pathname, businessSlug])

  const active =
    branches.find((b) => b.slug === activeLocationSlug) ?? branches[0]
  if (!active) return null

  const q = search.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    if (!q) return branches
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
    )
  }, [branches, q])

  return (
    <SidebarMenu className="w-auto min-w-0">
      <SidebarMenuItem className="w-auto">
        <DropdownMenu
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open)
            if (!open) setSearch("")
          }}
        >
          <DropdownMenuTrigger
            render={
              triggerVariant === "icon" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Location: ${active.name}. Open menu.`}
                  className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                />
              ) : (
                <SidebarMenuButton
                  size="default"
                  className="h-9 w-auto max-w-[min(280px,calc(100vw-12rem))] py-2 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                />
              )
            }
          >
            {triggerVariant === "icon" ? (
              <MapPinIcon className="size-5 shrink-0" aria-hidden />
            ) : (
              <>
                <div className="flex aspect-square size-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-transparent text-muted-foreground">
                  <MapPinIcon className="size-4 shrink-0" aria-hidden />
                </div>
                <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                  {active.name}
                </span>
                <ChevronDownIcon
                  className="ml-auto size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-72 rounded-lg p-0"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <div
              className="border-b border-border/60 p-2"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search locations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-xl border-transparent bg-secondary/80 pr-3 pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <DropdownMenuGroup className="max-h-64 overflow-y-auto p-1.5">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Locations
              </DropdownMenuLabel>
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No matches
                </div>
              ) : (
                filtered.map((b) => (
                  <DropdownMenuItem
                    key={b.slug}
                    className={cn(
                      "gap-2 p-2",
                      b.slug === active.slug && "bg-primary/10"
                    )}
                    onClick={() => {
                      if (b.slug === active.slug) return
                      router.push(
                        `/${businessSlug}/l/${b.slug}${restAfterLocation}`
                      )
                      router.refresh()
                      setMenuOpen(false)
                      setSearch("")
                    }}
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30 text-muted-foreground">
                      <MapPinIcon className="size-4 shrink-0" aria-hidden />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-left text-sm">
                      {b.name}
                    </span>
                    {b.slug === active.slug ? (
                      <span className="ml-auto text-xs text-primary">
                        <CheckIcon className="size-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-1.5">
              <DropdownMenuItem
                className="gap-2 rounded-xl font-medium"
                onClick={() => {
                  setMenuOpen(false)
                  setSearch("")
                  router.push(`/${businessSlug}/business/locations?add=1`)
                }}
              >
                <PlusIcon className="size-4 shrink-0" aria-hidden />
                Add location
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
