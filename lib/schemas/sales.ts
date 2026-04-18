import { z } from "zod"

import { transactionPaymentMethodValues } from "@/lib/db/schema-transactions"

export const createSaleLineAddonSchema = z.object({
  addonId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).optional().default(1),
})

export const createSaleLineInstructionSchema = z.object({
  instructionId: z.string().min(1),
})

export const createSaleLineSchema = z.object({
  productId: z.string().min(1),
  productPriceId: z.string().min(1),
  quantity: z.number().int().min(1).max(9999),
  addons: z.array(createSaleLineAddonSchema).max(50).optional().default([]),
  instructions: z
    .array(createSaleLineInstructionSchema)
    .max(50)
    .optional()
    .default([])
    .transform((arr) => {
      const seen = new Set<string>()
      return arr.filter((x) => {
        if (seen.has(x.instructionId)) return false
        seen.add(x.instructionId)
        return true
      })
    }),
})

export const createSaleInputSchema = z.object({
  businessSlug: z.string().min(1),
  locationSlug: z.string().min(1),
  paymentMethod: z.enum(transactionPaymentMethodValues),
  notes: z.string().max(2000).optional().nullable(),
  /** Name for the order (call-out). Empty after trim = none. */
  customerCallName: z.string().max(120).optional().nullable(),
  checkoutId: z.string().uuid().optional().nullable(),
  lines: z.array(createSaleLineSchema).min(1).max(500),
})

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>
