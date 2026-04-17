import type { StoreBranding, StoreLocation } from "@/lib/db/schema-app"
import {
  getDefaultLocationSlugForOrganization,
  listLocationsForOrganization,
} from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { getStoreBrandingByOrganizationId } from "@/lib/queries/store-branding"
import type { SidebarStoreNavItem } from "@/lib/types/nav"
import { listStoresForUser } from "@/lib/queries/stores"

export async function listSidebarStoresForUser(userId: string): Promise<SidebarStoreNavItem[]> {
  const stores = await listStoresForUser(userId)
  const out: SidebarStoreNavItem[] = []
  for (const s of stores) {
    const loc = await getDefaultLocationSlugForOrganization(s.organizationId)
    if (!loc) continue
    out.push({
      organizationId: s.organizationId,
      slug: s.slug,
      label: s.brandingDisplayName?.trim() || s.name,
      logoUrl: s.logoImageUrl,
      dashboardHref: `/${s.slug}/l/${loc}/dashboard`,
    })
  }
  return out
}

export type OrgShellData = {
  storeSlug: string
  organizationId: string
  organizationName: string
  memberRole: string
  branding: StoreBranding | null
  locations: StoreLocation[]
  sidebarStores: SidebarStoreNavItem[]
  defaultLocationSlug: string
  activeLocationSlug: string | null
  activeLocation: StoreLocation | null
}

/** Load store membership, branding, branches, and optional active branch. Returns null if forbidden or unknown branch slug. */
export async function loadOrgShellData(
  storeSlug: string,
  userId: string,
  locationSlug: string | null,
): Promise<OrgShellData | null> {
  const ctx = await getOrgForUser(storeSlug, userId)
  if (!ctx) return null

  const branding = await getStoreBrandingByOrganizationId(ctx.organization.id)
  const locations = await listLocationsForOrganization(ctx.organization.id)
  const sidebarStores = await listSidebarStoresForUser(userId)

  const defaultLoc = locations[0]
  if (!defaultLoc) return null

  let activeLocation: StoreLocation | null = null
  if (locationSlug) {
    activeLocation = locations.find((l) => l.slug === locationSlug) ?? null
    if (!activeLocation) return null
  }

  return {
    storeSlug,
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    memberRole: ctx.member.role,
    branding,
    locations,
    sidebarStores,
    defaultLocationSlug: defaultLoc.slug,
    activeLocationSlug: locationSlug,
    activeLocation,
  }
}
