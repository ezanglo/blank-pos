import { z } from "zod"

import { resolveBrandColorToCss } from "@/lib/brand-color"

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const setupOwnerSchema = z.object({
  username: z.string().min(2, "Username is too short"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  ownerName: z.string().min(1, "Display name is required"),
})
export type SetupOwnerFormValues = z.infer<typeof setupOwnerSchema>

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** POS web app identity: display name and URL segment (one store site per organization in v1). */
export const setupStoreSiteSchema = z.object({
  storeName: z.string().min(1, "Location name is required"),
  slug: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(2, "Slug is too short")
        .regex(slugRegex, "Use lowercase letters, numbers, and hyphens only"),
    ),
})
export type SetupStoreSiteFormValues = z.infer<typeof setupStoreSiteSchema>

/** Physical site defaults saved on the `location` table (1:1 with organization). */
export const setupLocationSchema = z.object({
  defaultCurrency: z.enum(["USD", "EUR", "GBP", "PHP"]),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
})
export type SetupLocationFormValues = z.infer<typeof setupLocationSchema>

/**
 * Create organization (store site) and its linked `location` row in one step (post-branding setup).
 * Defined as one object (not merge/extend) so Zod 4 output types work with react-hook-form resolvers.
 */
export const setupOrgLocationSchema = z.object({
  storeName: z.string().min(1, "Location name is required"),
  slug: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(2, "Slug is too short")
        .regex(slugRegex, "Use lowercase letters, numbers, and hyphens only"),
    ),
  defaultCurrency: z.enum(["USD", "EUR", "GBP", "PHP"]),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
})
export type SetupOrgLocationFormValues = z.infer<typeof setupOrgLocationSchema>

export const storeSettingsSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  defaultCurrency: z.enum(["USD", "EUR", "GBP", "PHP"]),
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
  logoImageUrl: optionalHttpUrlField(),
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
  /** Optional absolute URL for the sign-in page hero (`/login`). */
  loginBackgroundImageUrl: optionalHttpUrlField(),
  /** Optional HTTPS URL for store logo (header, login, receipts). */
  logoImageUrl: optionalHttpUrlField(),
})
export type BrandingSettingsFormValues = z.infer<typeof brandingSettingsSchema>

export const staffCreateSchema = z.object({
  username: z.string().min(2, "Username is too short"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Display name is required"),
  role: z.enum(["manager", "cashier"]),
})
export type StaffCreateFormValues = z.infer<typeof staffCreateSchema>
