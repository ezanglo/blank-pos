import { z } from "zod"

export const catalogAddonCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  amount: z.string().trim().min(1, "Price is required."),
  currency: z.string().trim().min(1, "Currency is required.").max(8),
  sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
})

export const catalogAddonUpdateSchema = catalogAddonCreateSchema.extend({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
})

export const catalogAddonSetCategoriesSchema = z.object({
  addonId: z.string().min(1),
  categoryIds: z.array(z.string().min(1)).max(500),
})
