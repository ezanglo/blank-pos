/** Stable snake_case key stored on `transactions.payment_method`. */
const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/

export function isValidPaymentMethodKey(key: string): boolean {
  return KEY_RE.test(key)
}

/** Build a unique key from a display label. */
export function paymentMethodKeyFromLabel(label: string, existing: Set<string>): string {
  const raw = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48)

  let base = raw.length > 0 ? raw : "method"
  if (!/^[a-z]/.test(base)) {
    base = `m_${base}`.replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "") || "method"
  }

  let key = base
  let n = 2
  while (existing.has(key)) {
    key = `${base}_${n}`
    n += 1
  }
  return key
}
