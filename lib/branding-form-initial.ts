import type { StoreBranding } from "@/lib/db/schema-app"
import { type BrandingSettingsFormValues } from "@/lib/schemas/app-forms"

export function emptyBrandingFormValues(
  overrides: Partial<BrandingSettingsFormValues> = {},
): BrandingSettingsFormValues {
  return {
    displayName: "",
    tagline: "",
    receiptHeaderText: "",
    receiptFooterText: "",
    legalName: "",
    taxIdentifier: "",
    websiteUrl: "",
    menuUrl: "",
    contactEmail: "",
    publicPhone: "",
    instagramUrl: "",
    facebookUrl: "",
    operatingHoursText: "",
    primaryColor: "",
    accentColor: "",
    logoImageUrl: "",
    ...overrides,
  }
}

/** Maps a `store_branding` row into react-hook-form defaults. */
export function storeBrandingRowToFormInitial(row: StoreBranding): BrandingSettingsFormValues {
  const d = emptyBrandingFormValues()
  return {
    displayName: row.displayName ?? d.displayName,
    tagline: row.tagline ?? d.tagline,
    receiptHeaderText: row.receiptHeaderText ?? d.receiptHeaderText,
    receiptFooterText: row.receiptFooterText ?? d.receiptFooterText,
    legalName: row.legalName ?? d.legalName,
    taxIdentifier: row.taxIdentifier ?? d.taxIdentifier,
    websiteUrl: row.websiteUrl ?? d.websiteUrl,
    menuUrl: row.menuUrl ?? d.menuUrl,
    contactEmail: row.contactEmail ?? d.contactEmail,
    publicPhone: row.publicPhone ?? d.publicPhone,
    instagramUrl: row.instagramUrl ?? d.instagramUrl,
    facebookUrl: row.facebookUrl ?? d.facebookUrl,
    operatingHoursText: row.operatingHoursText ?? d.operatingHoursText,
    primaryColor: row.primaryColor ?? d.primaryColor,
    accentColor: row.accentColor ?? d.accentColor,
    logoImageUrl: row.logoImageUrl ?? d.logoImageUrl,
  }
}
