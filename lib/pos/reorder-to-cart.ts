import type { PosProductCard } from "@/lib/pos/pos-types"
import type { PosReorderPayloadSerialized } from "@/lib/pos/reorder-payload"
import { createPosCartLine, type PosCartLine } from "@/lib/stores/pos-cart-store"

export function buildCartLinesFromReorderPayload(
  products: PosProductCard[],
  payload: PosReorderPayloadSerialized,
): { lines: PosCartLine[]; warnings: string[] } {
  const warnings: string[] = []
  const lines: PosCartLine[] = []
  const byId = new Map(products.map((p) => [p.id, p]))

  for (const row of payload.lines) {
    const p = byId.get(row.productId)
    if (!p) {
      warnings.push(`${row.productName} is no longer in the menu.`)
      continue
    }
    const tier = p.prices.find((x) => x.id === row.productPriceId)
    if (!tier) {
      warnings.push(`${row.productName}: that price option is no longer available.`)
      continue
    }
    const addonSelections = row.addons.map((a) => ({
      addonId: a.addonId,
      name: a.name,
      unitPriceMinor: a.unitPriceMinor,
      currency: tier.currency,
      quantity: a.quantity,
    }))
    const instructionSelections = row.instructions.map((i) => ({
      instructionId: i.instructionId,
      label: i.label,
    }))
    const line = createPosCartLine(
      p,
      row.productPriceId,
      row.quantity,
      addonSelections,
      instructionSelections,
    )
    if (!line) {
      warnings.push(`${row.productName} could not be added.`)
      continue
    }
    lines.push(line)
  }

  return { lines, warnings }
}
