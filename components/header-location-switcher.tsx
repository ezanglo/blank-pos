"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MapPinIcon } from "lucide-react"

export type HeaderBranch = { slug: string; name: string }

/** Branch switcher for the header (current store only). */
export function HeaderLocationSwitcher({
  storeSlug,
  branches,
  activeLocationSlug,
}: {
  storeSlug: string
  branches: HeaderBranch[]
  activeLocationSlug: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()

  const restAfterLocation = React.useMemo(() => {
    const prefix = `/${storeSlug}/l/`
    const idx = pathname.indexOf(prefix)
    if (idx === -1) return "/dashboard"
    const after = pathname.slice(idx + prefix.length)
    const slash = after.indexOf("/")
    const tail = slash === -1 ? "" : after.slice(slash)
    return tail || "/dashboard"
  }, [pathname, storeSlug])

  const active = branches.find((b) => b.slug === activeLocationSlug) ?? branches[0]
  if (!active) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "max-w-[220px] gap-2",
        )}
      >
        <MapPinIcon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{active.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Locations</DropdownMenuLabel>
          {branches.map((b) => (
            <DropdownMenuItem
              key={b.slug}
              onClick={() => {
                router.push(`/${storeSlug}/l/${b.slug}${restAfterLocation}`)
                router.refresh()
              }}
            >
              {b.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
