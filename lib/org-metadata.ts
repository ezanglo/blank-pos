export type OrgMetadata = {
  defaultCurrency?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  phone?: string
}

export function parseOrgMetadata(raw: string | null | undefined): OrgMetadata {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as OrgMetadata
  } catch {
    return {}
  }
}

export function stringifyOrgMetadata(data: OrgMetadata): string {
  return JSON.stringify(data)
}
