import { z } from "zod"

import { resolveBrandColorToCss } from "@/lib/brand-color"
import { SETUP_WEB_SLUG_REGEX } from "@/lib/setup-slug-normalize"

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
export type SignUpFormValues = z.infer<typeof signUpSchema>

/** Store display name + editable web slug (defaults from name in the UI). */
export const setupStoreSiteSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  slug: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(2, "Store link is too short")
        .regex(SETUP_WEB_SLUG_REGEX, "Use lowercase letters, numbers, and hyphens only"),
    ),
})
export type SetupStoreSiteFormValues = z.infer<typeof setupStoreSiteSchema>

/** Store + org web slug + first-pass branding (onboarding store step). `business_details.display_name` uses `storeName`. */
export const setupStoreWithBrandingSchema = setupStoreSiteSchema.extend({
  logoImageUrl: optionalLogoImageUrlField(),
  businessCategory: z.string().optional(),
  teamScaleBand: z.string().optional(),
  expectedGoLive: z.string().optional(),
})
export type SetupStoreWithBrandingFormValues = z.infer<typeof setupStoreWithBrandingSchema>

/** Branch defaults saved on the `location` table (many per store). */
export const setupLocationSchema = z.object({
  defaultCurrency: z.enum(["PHP", "USD", "EUR", "GBP"]),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
})
export type SetupLocationFormValues = z.infer<typeof setupLocationSchema>

/** First branch after the store exists; location slug is editable (suggested from name in UI). */
export const setupFirstLocationSchema = setupLocationSchema.extend({
  locationName: z.string().min(1, "Location name is required"),
  locationSlug: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(2, "Location link is too short")
        .regex(SETUP_WEB_SLUG_REGEX, "Use lowercase letters, numbers, and hyphens only"),
    ),
})
export type SetupFirstLocationFormValues = z.infer<typeof setupFirstLocationSchema>

/** Org admin: edit branch row (slug not editable here). */
export const adminLocationBranchSchema = setupLocationSchema.extend({
  locationName: z.string().min(1, "Location name is required"),
})
export type AdminLocationBranchFormValues = z.infer<typeof adminLocationBranchSchema>

/** Settings → Locations: add branch with display name + URL slug only (currency defaults to PHP, address empty). */
export const adminAddLocationSchema = z.object({
  locationName: z.string().min(1, "Location name is required"),
  locationSlug: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(2, "Location link is too short")
        .regex(SETUP_WEB_SLUG_REGEX, "Use lowercase letters, numbers, and hyphens only"),
    ),
})
export type AdminAddLocationFormValues = z.infer<typeof adminAddLocationSchema>

/** Settings → Locations: edit branch name + currency (address edited separately). */
export const adminLocationBranchCoreSchema = z.object({
  locationName: z.string().min(1, "Location name is required"),
  defaultCurrency: z.enum(["PHP", "USD", "EUR", "GBP"]),
})
export type AdminLocationBranchCoreFormValues = z.infer<typeof adminLocationBranchCoreSchema>

export const storeSettingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  locationName: z.string().min(1, "Location name is required"),
  defaultCurrency: z.enum(["PHP", "USD", "EUR", "GBP"]),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
})
export type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>

function optionalHttpUrlField() {
  return z
    .string()
    .optional()
    .refine((v) => {
      if (!v?.trim()) return true
      try {
        const u = new URL(v.trim())
        return u.protocol === "http:" || u.protocol === "https:"
      } catch {
        return false
      }
    }, "Use a valid http(s) URL or leave blank")
}

/** Logo: https URL, or same-origin uploaded path `/uploads/...`. */
function optionalLogoImageUrlField() {
  return z
    .string()
    .optional()
    .refine((v) => {
      const t = v?.trim()
      if (!t) return true
      if (t.startsWith("/uploads/")) {
        return !t.includes("..") && t.length > "/uploads/".length
      }
      try {
        const u = new URL(t)
        return u.protocol === "http:" || u.protocol === "https:"
      } catch {
        return false
      }
    }, "Use a valid http(s) URL, a path starting with /uploads/, or leave blank")
}

/** Empty, Tailwind token (`red-500`), or hex (`#RGB` / `#RRGGBB`). */
function optionalBrandColorField() {
  return z
    .string()
    .optional()
    .refine((v) => {
      const t = v?.trim()
      if (!t) return true
      return resolveBrandColorToCss(t) !== null
    }, "Pick a palette color, or use #RGB / #RRGGBB, or leave blank")
}

function optionalEmailField() {
  return z
    .string()
    .optional()
    .refine((v) => {
      const t = v?.trim()
      if (!t) return true
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
    }, "Use a valid email or leave blank")
}

/** First-run setup only; full branding lives in Settings. */
export const setupBrandingSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  logoImageUrl: optionalLogoImageUrlField(),
  businessCategory: z.string().optional(),
  teamScaleBand: z.string().optional(),
  expectedGoLive: z.string().optional(),
})
export type SetupBrandingFormValues = z.infer<typeof setupBrandingSchema>

export const brandingSettingsSchema = z.object({
  displayName: z.string().optional(),
  tagline: z.string().optional(),
  receiptHeaderText: z.string().optional(),
  receiptFooterText: z.string().optional(),
  legalName: z.string().optional(),
  taxIdentifier: z.string().optional(),
  websiteUrl: optionalHttpUrlField(),
  menuUrl: optionalHttpUrlField(),
  contactEmail: optionalEmailField(),
  publicPhone: z.string().optional(),
  instagramUrl: optionalHttpUrlField(),
  facebookUrl: optionalHttpUrlField(),
  operatingHoursText: z.string().optional(),
  primaryColor: optionalBrandColorField(),
  accentColor: optionalBrandColorField(),
  /** Optional logo URL (https) or uploaded path `/uploads/...`. */
  logoImageUrl: optionalLogoImageUrlField(),
  businessCategory: z.string().optional(),
  teamScaleBand: z.string().optional(),
  expectedGoLive: z.string().optional(),
})
export type BrandingSettingsFormValues = z.infer<typeof brandingSettingsSchema>

export const organizationStoreNameSchema = z.object({
  organizationName: z.string().min(1, "Store name is required"),
})
export type OrganizationStoreNameFormValues = z.infer<typeof organizationStoreNameSchema>

export const businessSettingsIdentitySchema = brandingSettingsSchema.pick({
  displayName: true,
  tagline: true,
  legalName: true,
  taxIdentifier: true,
})
export type BusinessSettingsIdentityFormValues = z.infer<typeof businessSettingsIdentitySchema>

export const businessSettingsOperationsSchema = brandingSettingsSchema.pick({
  businessCategory: true,
  teamScaleBand: true,
  expectedGoLive: true,
})
export type BusinessSettingsOperationsFormValues = z.infer<typeof businessSettingsOperationsSchema>

export const businessSettingsBrandSchema = brandingSettingsSchema.pick({
  logoImageUrl: true,
  primaryColor: true,
  accentColor: true,
})
export type BusinessSettingsBrandFormValues = z.infer<typeof businessSettingsBrandSchema>

export const businessSettingsReceiptSchema = brandingSettingsSchema.pick({
  receiptHeaderText: true,
  receiptFooterText: true,
})
export type BusinessSettingsReceiptFormValues = z.infer<typeof businessSettingsReceiptSchema>

export const businessSettingsWebContactSchema = brandingSettingsSchema.pick({
  websiteUrl: true,
  menuUrl: true,
  contactEmail: true,
  publicPhone: true,
})
export type BusinessSettingsWebContactFormValues = z.infer<typeof businessSettingsWebContactSchema>

export const businessSettingsSocialSchema = brandingSettingsSchema.pick({
  instagramUrl: true,
  facebookUrl: true,
  operatingHoursText: true,
})
export type BusinessSettingsSocialFormValues = z.infer<typeof businessSettingsSocialSchema>

export const staffCreateSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Display name is required"),
  role: z.enum(["manager", "cashier"]),
})
export type StaffCreateFormValues = z.infer<typeof staffCreateSchema>
