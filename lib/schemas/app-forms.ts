import { z } from "zod"

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

export const setupStoreSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
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
  phone: z.string().optional(),
})
export type SetupStoreFormValues = z.infer<typeof setupStoreSchema>

export const setupBrandingSchema = z.object({
  displayName: z.string().optional(),
  tagline: z.string().optional(),
  primaryColor: z.string(),
  accentColor: z.string(),
})
export type SetupBrandingFormValues = z.infer<typeof setupBrandingSchema>

export const storeSettingsSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  defaultCurrency: z.enum(["USD", "EUR", "GBP", "PHP"]),
  addressLine1: z.string().optional(),
  phone: z.string().optional(),
})
export type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>

export const brandingSettingsSchema = z.object({
  displayName: z.string().optional(),
  tagline: z.string().optional(),
  primaryColor: z.string(),
  accentColor: z.string(),
  receiptHeaderText: z.string().optional(),
  receiptFooterText: z.string().optional(),
})
export type BrandingSettingsFormValues = z.infer<typeof brandingSettingsSchema>

export const staffCreateSchema = z.object({
  username: z.string().min(2, "Username is too short"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Display name is required"),
  role: z.enum(["manager", "cashier"]),
})
export type StaffCreateFormValues = z.infer<typeof staffCreateSchema>
