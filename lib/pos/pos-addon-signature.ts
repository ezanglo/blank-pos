/**
 * Canonical merge key for cart lines: same product, price tier, and add-on rows
 * (sorted by addon id, including per-add-on quantity).
 */
export function posCartAddonSignature(
  addons: { addonId: string; quantity: number }[],
): string {
  if (addons.length === 0) return ""
  return [...addons]
    .map((a) => ({ id: a.addonId, q: Math.max(1, Math.floor(a.quantity)) }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((a) => `${a.id}:${a.q}`)
    .join("|")
}
