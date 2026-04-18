import { z } from "zod"

import { productAvailabilityModeValues } from "@/lib/db/schema-catalog"

export const catalogAvailabilityModeSchema = z.enum(productAvailabilityModeValues)

export const catalogCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  color: z.string().trim().max(32).optional().nullable(),
  icon: z.string().trim().max(64).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
})

export const catalogCategoryUpdateSchema = catalogCategoryCreateSchema.extend({
  id: z.string().min(1),
})

/** Full ordered list of category IDs for the organization (permutation of current rows). */
export const catalogCategoryReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
})

export const catalogCategoryVariantCreateSchema = z.object({
  categoryId: z.string().min(1),
  label: z.string().trim().min(1, "Label is required.").max(120),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
})

export const catalogCategoryVariantUpdateSchema = catalogCategoryVariantCreateSchema.extend({
  id: z.string().min(1),
})

/** Permutation of variant IDs for one category (catalog / POS order). */
export const catalogCategoryVariantReorderSchema = z.object({
  categoryId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)),
})

export const catalogCategoryInstructionCreateSchema = z.object({
  categoryId: z.string().min(1),
  label: z.string().trim().min(1, "Label is required.").max(200),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
})

export const catalogCategoryInstructionUpdateSchema = catalogCategoryInstructionCreateSchema.extend({
  id: z.string().min(1),
})

/** Permutation of instruction IDs for one category (POS list order). */
export const catalogCategoryInstructionReorderSchema = z.object({
  categoryId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)),
})

export const catalogInventoryItemCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  unit: z.string().trim().min(1, "Unit is required.").max(64),
  costAmount: z.string().trim().min(1, "Cost is required."),
  reorderPoint: z.coerce.number().int().min(0).nullable().optional(),
  initialStock: z.coerce.number().int().min(0).optional(),
})

export const catalogInventoryItemUpdateSchema = catalogInventoryItemCreateSchema
  .omit({ initialStock: true })
  .extend({ id: z.string().min(1) })

export const catalogProductPriceInputSchema = z.object({
  categoryVariantId: z.string().trim().min(1, "Choose a variant."),
  amount: z.string().trim().min(1, "Amount is required."),
  isDefault: z.boolean().optional(),
})

export const catalogProductIngredientInputSchema = z.object({
  inventoryItemId: z.string().min(1),
  quantity: z.string().trim().min(1, "Quantity is required."),
})

function isValidProductImageUrl(s: string): boolean {
  if (s.length > 2000) return false
  if (s.startsWith("/uploads/")) {
    return !s.includes("..") && s.length > "/uploads/".length
  }
  try {
    const u = new URL(s)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/** Same-origin upload path or public http(s) URL; empty or omitted becomes null. */
export const catalogProductImageUrlSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((s) => {
    if (s == null || s === undefined) return null
    const t = String(s).trim()
    return t === "" ? null : t
  })
  .refine((s) => s === null || isValidProductImageUrl(s), {
    message: "Use a valid http(s) URL, a path starting with /uploads/, or leave blank.",
  })

export const catalogProductCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  categoryId: z.string().min(1),
  sku: z.string().trim().max(120).optional().nullable(),
  /** Value embedded when generating / matching QR scans at POS (can be longer than legacy barcodes). */
  qrCode: z.string().trim().max(2000).optional().nullable(),
  imageUrl: catalogProductImageUrlSchema.optional(),
  isActive: z.boolean().optional(),
  isComposite: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  availabilityMode: catalogAvailabilityModeSchema,
  locationIds: z.array(z.string()).optional(),
  prices: z.array(catalogProductPriceInputSchema).default([]),
  ingredients: z.array(catalogProductIngredientInputSchema).optional(),
})

/** Single product price row (variant + amount); label and sort order come from the variant. */
export const catalogProductPriceLineCreateSchema = z.object({
  productId: z.string().min(1),
  categoryVariantId: z.string().trim().min(1, "Choose a variant."),
  amount: z.string().trim().min(1, "Amount is required."),
  isDefault: z.boolean().optional(),
})

export const catalogProductPriceLineUpdateSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  categoryVariantId: z.string().trim().min(1, "Choose a variant."),
  amount: z.string().trim().min(1, "Amount is required."),
  isDefault: z.boolean().optional(),
})

export const catalogProductUpdateSchema = catalogProductCreateSchema
  .omit({ prices: true })
  .extend({
    id: z.string().min(1),
    prices: z.array(catalogProductPriceInputSchema).optional(),
  })
