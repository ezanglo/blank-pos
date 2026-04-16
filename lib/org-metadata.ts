/** Keys that used to live on organization.metadata; stripped when saving org so they stay on `location` only. */
const LOCATION_METADATA_KEYS = new Set([
  "defaultCurrency",
  "addressLine1",
  "addressLine2",
  "city",
  "region",
  "postalCode",
  "phone",
])

export function parseOrganizationMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** Returns metadata safe to pass to better-auth after removing migrated location fields. */
export function stripLocationKeysFromOrganizationMetadata(
  raw: string | null | undefined,
): Record<string, unknown> {
  const obj = parseOrganizationMetadata(raw)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!LOCATION_METADATA_KEYS.has(k)) out[k] = v
  }
  return out
}
