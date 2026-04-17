"use client"

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"

import { BusinessMark } from "@/components/business-switcher"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { seedInitialBusinessDetailsAfterOrgCreate } from "@/lib/actions/branding"
import { createFirstLocationAfterOrgCreate } from "@/lib/actions/organization"
import { checkSetupStoreSlugAvailable } from "@/lib/actions/setup-slugs"
import { authClient } from "@/lib/auth-client"
import {
  setupStoreSiteSchema,
  type SetupStoreSiteFormValues,
} from "@/lib/schemas/app-forms"
import { normalizeSetupWebSlug } from "@/lib/setup-slug-normalize"
import { slugifyWebSegmentFromName } from "@/lib/slugify-web-segment"
import type { SidebarBusinessNavItem } from "@/lib/types/nav"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon } from "lucide-react"

const SLUG_DEBOUNCE_MS = 1400

type SlugHint = "idle" | "checking" | "available" | "taken" | "invalid"

const DEFAULT_LOCATION_SLUG = "main"
const DEFAULT_LOCATION_NAME = "Main"

function CreateBusinessDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [slugHint, setSlugHint] = React.useState<SlugHint>("idle")

  const form = useForm<SetupStoreSiteFormValues>({
    resolver: standardSchemaResolver(setupStoreSiteSchema),
    defaultValues: { storeName: "", slug: "" },
  })

  const storeNameWatch = form.watch("storeName")
  const slugWatch = form.watch("slug")
  const lastAutoSlug = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      form.reset({ storeName: "", slug: "" })
      setSlugHint("idle")
      lastAutoSlug.current = null
    }
  }, [open, form])

  React.useEffect(() => {
    const name = storeNameWatch?.trim()
    if (!name) return
    const suggested = slugifyWebSegmentFromName(name)
    const current = (form.getValues("slug") ?? "").trim()
    if (current === "" || current === lastAutoSlug.current) {
      form.setValue("slug", suggested, { shouldValidate: true })
      lastAutoSlug.current = suggested
    }
  }, [storeNameWatch, form])

  React.useEffect(() => {
    const raw = slugWatch ?? ""
    if (!raw.trim()) {
      setSlugHint("idle")
      return
    }
    if (!normalizeSetupWebSlug(raw)) {
      setSlugHint("invalid")
      return
    }
    setSlugHint("checking")
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      const latest = form.getValues("slug") ?? ""
      if (!normalizeSetupWebSlug(latest)) {
        if (!cancelled) setSlugHint("invalid")
        return
      }
      const res = await checkSetupStoreSlugAvailable(latest)
      if (cancelled) return
      setSlugHint(res.status)
    }, SLUG_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slugWatch, form])

  const slugBlocked =
    slugHint === "taken" || slugHint === "invalid" || slugHint === "checking"

  async function onSubmit(values: SetupStoreSiteFormValues) {
    const slug = values.slug
    try {
      const res = await authClient.organization.create({
        name: values.storeName.trim(),
        slug,
        metadata: {} as Record<string, unknown>,
        keepCurrentActiveOrganization: false,
      })
      if (res.error) {
        form.setError("root", {
          message: res.error.message ?? "Could not create this business",
        })
        return
      }
      await seedInitialBusinessDetailsAfterOrgCreate(slug)
      await createFirstLocationAfterOrgCreate(slug, {
        locationSlug: DEFAULT_LOCATION_SLUG,
        locationName: DEFAULT_LOCATION_NAME,
        location: { defaultCurrency: "PHP" },
      })
      onOpenChange(false)
      router.push(`/${slug}/l/${DEFAULT_LOCATION_SLUG}/dashboard`)
      router.refresh()
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>New business</DialogTitle>
            <DialogDescription>
              Create an organization, then open its dashboard. You can add more
              locations in Settings later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {form.formState.errors.root?.message ? (
              <p className="rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="create-biz-name">Business name</Label>
              <Input
                id="create-biz-name"
                autoComplete="organization"
                disabled={form.formState.isSubmitting}
                {...form.register("storeName")}
              />
              {form.formState.errors.storeName?.message ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.storeName.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-biz-slug">Business web link</Label>
              <Input
                id="create-biz-slug"
                placeholder="e.g. acme-retail"
                autoComplete="off"
                disabled={form.formState.isSubmitting}
                {...form.register("slug")}
              />
              <p className="text-xs text-muted-foreground">
                Opens at /{slugWatch?.trim() || "your-store"}/l/
                {DEFAULT_LOCATION_SLUG}/… — lowercase letters, numbers, hyphens.
              </p>
              {slugHint === "checking" ? (
                <p className="text-xs text-muted-foreground">
                  Checking if this link is available…
                </p>
              ) : null}
              {slugHint === "available" ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  This link is available.
                </p>
              ) : null}
              {slugHint === "taken" ? (
                <p className="text-xs text-destructive">
                  That link is already taken. Try another.
                </p>
              ) : null}
              {slugHint === "invalid" ? (
                <p className="text-xs text-destructive">
                  Use 2+ characters: lowercase letters, numbers, and hyphens
                  only.
                </p>
              ) : null}
              {form.formState.errors.slug?.message ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.slug.message}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || slugBlocked}
            >
              {form.formState.isSubmitting ? "Creating…" : "Create business"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function HeaderBusinessSwitcher({
  businesses,
  activeLocationName,
}: {
  businesses: SidebarBusinessNavItem[]
  /** Shown under the business name when set (e.g. current location). */
  activeLocationName?: string | null
}) {
  const { isMobile } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const activeSlug = React.useMemo(() => {
    const m = pathname.match(/^\/([^/]+)/)
    return m?.[1] ?? businesses[0]?.slug
  }, [pathname, businesses])

  const active = businesses.find((s) => s.slug === activeSlug) ?? businesses[0]
  if (!active) return null

  const q = search.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    if (!q) return businesses
    return businesses.filter(
      (b) =>
        b.label.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
    )
  }, [businesses, q])

  return (
    <SidebarMenu className="w-auto min-w-0">
      <SidebarMenuItem className="w-auto">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="default"
                className="h-auto min-h-10 w-auto max-w-[min(320px,calc(100vw-8rem))] gap-3 py-2 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground md:h-9 md:min-h-9 md:max-w-[min(280px,calc(100vw-12rem))] md:gap-2 md:py-2"
              />
            }
          >
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-transparent text-muted-foreground md:size-6 md:rounded-lg">
              <BusinessMark
                logoUrl={active.logoUrl}
                fallbackIconClassName="size-6 md:size-4"
              />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <span className="block truncate text-base font-semibold leading-tight md:text-sm md:font-medium">
                {active.label}
              </span>
              {activeLocationName ? (
                <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground leading-tight md:hidden">
                  {activeLocationName}
                </span>
              ) : null}
            </div>
            <ChevronDownIcon
              className="ml-auto size-4 shrink-0 self-center text-muted-foreground md:self-auto"
              aria-hidden
            />
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
                  placeholder="Search businesses…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-xl border-transparent bg-secondary/80 pr-3 pl-10"
                  autoComplete="off"
                />
              </div>
            </div>
            <DropdownMenuGroup className="max-h-64 overflow-y-auto p-1.5">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Businesses
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
                      b.slug === activeSlug && "bg-primary/10"
                    )}
                    onClick={async () => {
                      if (b.slug === activeSlug) return
                      await authClient.organization.setActive({
                        organizationId: b.organizationId,
                      })
                      router.push(b.dashboardHref)
                      router.refresh()
                      setMenuOpen(false)
                      setSearch("")
                    }}
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                      <BusinessMark logoUrl={b.logoUrl} />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-left text-sm">
                      {b.label}
                    </span>
                    {b.slug === activeSlug ? (
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
                  setCreateOpen(true)
                }}
              >
                <PlusIcon className="size-4 shrink-0" aria-hidden />
                New business
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateBusinessDialog open={createOpen} onOpenChange={setCreateOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
