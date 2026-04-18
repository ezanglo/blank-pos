export type PosProductPrice = {
  id: string
  label: string
  /** Serialized bigint string for client JSON. */
  amountMinor: string
  currency: string
  isDefault: boolean
  sortOrder: number
}

export type PosProductCard = {
  id: string
  name: string
  imageUrl: string | null
  sku: string | null
  qrCode: string | null
  categoryId: string
  categoryName: string
  prices: PosProductPrice[]
}

/**
 * POS price tier: prefer `is_default`, else lowest `sort_order`, then label.
 * Per-line tier in cart; used when adding a product to pick the default row.
 */
export function pickDefaultProductPriceId(prices: PosProductPrice[]): string | null {
  if (prices.length === 0) return null
  const def = prices.find((p) => p.isDefault)
  if (def) return def.id
  const sorted = [...prices].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  )
  return sorted[0]?.id ?? null
}
