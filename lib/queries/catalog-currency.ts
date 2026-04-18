import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { businessDetails } from "@/lib/db/schema-app"
import { listLocationsForOrganization } from "@/lib/queries/location"

/**
 * ISO 4217 code for new/edited catalog prices and add-ons: business Settings default when set,
 * otherwise the default branch’s currency (first row with `is_default`, else oldest).
 */
export async function getDefaultCatalogCurrencyCode(organizationId: string): Promise<string> {
  const db = getDb()
  const [bd] = await db
    .select({ c: businessDetails.defaultCurrency })
    .from(businessDetails)
    .where(eq(businessDetails.organizationId, organizationId))
    .limit(1)
  const fromOrg = bd?.c?.trim()
  if (fromOrg) return fromOrg.toUpperCase()
  const locs = await listLocationsForOrganization(organizationId)
  const fromLoc = locs[0]?.defaultCurrency?.trim()
  return fromLoc ? fromLoc.toUpperCase() : "PHP"
}
