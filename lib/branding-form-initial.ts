import type { BusinessDetails } from "@/lib/db/schema-app"
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
    businessCategory: "",
    teamScaleBand: "",
    expectedGoLive: "",
    ...overrides,
  }
}

/** Maps a `business_details` row into react-hook-form defaults. */
export function businessDetailsRowToFormInitial(row: BusinessDetails): BrandingSettingsFormValues {
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
    businessCategory: row.businessCategory ?? d.businessCategory,
    teamScaleBand: row.teamScaleBand ?? d.teamScaleBand,
    expectedGoLive: row.expectedGoLive ?? d.expectedGoLive,
  }
}
