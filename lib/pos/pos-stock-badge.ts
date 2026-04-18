/** Max sellable units shown as "low" when no ingredient is at reorder. */
const LOW_SELLABLE_UNITS_THRESHOLD = 10

type PosIngredientStockLine = {
  quantityMilli: number
  stockQuantity: number
  reorderPoint: number | null
}

export type PosStockBadgeResult = {
  sellableUnits: number | null
  stockBadge: "out" | "low" | "ok" | null
}

/**
 * Derives POS stock badges from recipe lines and `inventory_stock` / `reorder_point`.
 * Used for **ingredient-based (composite) products** and for **track-inventory** SKUs linked to a recipe.
 * No lines → no badge.
 */
export function derivePosStockBadge(lines: PosIngredientStockLine[]): PosStockBadgeResult {
  if (lines.length === 0) return { sellableUnits: null, stockBadge: null }

  let minUnits = Number.POSITIVE_INFINITY
  for (const l of lines) {
    if (l.quantityMilli <= 0) {
      return { sellableUnits: 0, stockBadge: "out" }
    }
    const units = Math.floor((l.stockQuantity * 1000) / l.quantityMilli)
    minUnits = Math.min(minUnits, units)
  }

  const sellable = Number.isFinite(minUnits) ? Math.max(0, minUnits) : 0
  if (sellable <= 0) return { sellableUnits: sellable, stockBadge: "out" }

  const anyAtOrBelowReorder = lines.some(
    (l) => l.reorderPoint != null && l.stockQuantity <= l.reorderPoint,
  )
  const fewServingsLeft = sellable <= LOW_SELLABLE_UNITS_THRESHOLD
  if (anyAtOrBelowReorder || fewServingsLeft) {
    return { sellableUnits: sellable, stockBadge: "low" }
  }

  return { sellableUnits: sellable, stockBadge: "ok" }
}
