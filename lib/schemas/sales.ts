import { z } from "zod"

import { transactionPaymentMethodValues } from "@/lib/db/schema-transactions"

export const createSaleLineSchema = z.object({
  productId: z.string().min(1),
  productPriceId: z.string().min(1),
  quantity: z.number().int().min(1).max(9999),
})

export const createSaleInputSchema = z.object({
  businessSlug: z.string().min(1),
  locationSlug: z.string().min(1),
  paymentMethod: z.enum(transactionPaymentMethodValues),
  notes: z.string().max(2000).optional().nullable(),
  checkoutId: z.string().uuid().optional().nullable(),
  lines: z.array(createSaleLineSchema).min(1).max(500),
})

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>
