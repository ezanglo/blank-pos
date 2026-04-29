import type { BusinessDetails, BusinessLocation } from "@/lib/db/schema-app"
import {
  getDefaultLocationSlugsForOrganizationIds,
  listLocationsForOrganization,
} from "@/lib/queries/location"
import { getOrgForUser } from "@/lib/queries/organization"
import { getBusinessDetailsByOrganizationId } from "@/lib/queries/business-details"
import type { SidebarBusinessNavItem } from "@/lib/types/nav"
import { listBusinessesForUser } from "@/lib/queries/stores"

export async function listSidebarBusinessesForUser(
  userId: string,
): Promise<SidebarBusinessNavItem[]> {
  const businesses = await listBusinessesForUser(userId)
  const slugByOrgId = await getDefaultLocationSlugsForOrganizationIds(
    businesses.map((b) => b.organizationId),
  )
  const out: SidebarBusinessNavItem[] = []
  for (const b of businesses) {
    const loc = slugByOrgId.get(b.organizationId)
    if (!loc) continue
    out.push({
      organizationId: b.organizationId,
      slug: b.slug,
      label: b.brandingDisplayName?.trim() || b.name,
      logoUrl: b.logoImageUrl,
      dashboardHref: `/${b.slug}/l/${loc}/dashboard`,
    })
  }
  return out
}

export type OrgShellData = {
  businessSlug: string
  organizationId: string
  organizationName: string
  memberRole: string
  businessDetails: BusinessDetails | null
  locations: BusinessLocation[]
  sidebarBusinesses: SidebarBusinessNavItem[]
  defaultLocationSlug: string
  activeLocationSlug: string | null
  activeLocation: BusinessLocation | null
}

/** Load org membership, business details, branches, and optional active branch. */
export async function loadOrgShellData(
  businessSlug: string,
  userId: string,
  locationSlug: string | null,
): Promise<OrgShellData | null> {
  const ctx = await getOrgForUser(businessSlug, userId)
  if (!ctx) return null

  const [details, locations, sidebarBusinesses] = await Promise.all([
    getBusinessDetailsByOrganizationId(ctx.organization.id),
    listLocationsForOrganization(ctx.organization.id),
    listSidebarBusinessesForUser(userId),
  ])

  const defaultLoc = locations[0]
  if (!defaultLoc) return null

  let activeLocation: BusinessLocation | null = null
  if (locationSlug) {
    activeLocation = locations.find((l) => l.slug === locationSlug) ?? null
    if (!activeLocation) return null
  }

  return {
    businessSlug,
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    memberRole: ctx.member.role,
    businessDetails: details,
    locations,
    sidebarBusinesses,
    defaultLocationSlug: defaultLoc.slug,
    activeLocationSlug: locationSlug,
    activeLocation,
  }
}
