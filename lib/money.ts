/**
 * Money in **integer minor units** (e.g. cents / centavos for ISO 4217 exponent 2).
 * No floating-point in persisted values or arithmetic.
 */

const MILLI = BigInt(1000)
const HUNDRED = BigInt(100)
const ZERO = BigInt(0)

/** Parse a non-negative decimal string with at most 2 fractional digits → minor units. */
export function parseDecimal2ToMinor(input: string): bigint {
  const normalized = input.trim().replace(/,/g, "")
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error("Enter a valid amount with up to 2 decimal places.")
  }
  const [whole, frac = ""] = normalized.split(".")
  const minorPad = (frac + "00").slice(0, 2)
  return BigInt(whole) * HUNDRED + BigInt(minorPad)
}

export function formatMinorToDecimal2(minor: bigint): string {
  const sign = minor < ZERO ? "-" : ""
  const v = minor < ZERO ? -minor : minor
  const whole = v / HUNDRED
  const frac = (v % HUNDRED).toString().padStart(2, "0")
  return `${sign}${whole.toString()}.${frac}`
}

export function parseMinorFromSerialized(value: string): bigint {
  const t = value.trim()
  if (!/^-?\d+$/.test(t)) throw new Error("Invalid amount.")
  return BigInt(t)
}

export function serializeMinor(value: bigint): string {
  return value.toString()
}

/** Half-up: ingredient line cost in minor units from cost-per-unit (minor) × quantity (milli-units). */
export function ingredientLineCostMinor(costPerUnitMinor: bigint, quantityMilli: number): bigint {
  if (quantityMilli < 0) throw new Error("Quantity must be non-negative.")
  const q = BigInt(quantityMilli)
  return (costPerUnitMinor * q + MILLI / BigInt(2)) / MILLI
}

/** Parse quantity with up to 3 decimal places → milli-units (integer). */
export function parseDecimal3ToMilli(input: string): number {
  const normalized = input.trim().replace(/,/g, "")
  if (!/^\d+(\.\d{0,3})?$/.test(normalized)) {
    throw new Error("Enter a valid quantity with up to 3 decimal places.")
  }
  const [whole, frac = ""] = normalized.split(".")
  const milliPad = (frac + "000").slice(0, 3)
  const n = Number(whole) * 1000 + Number(milliPad)
  if (!Number.isSafeInteger(n)) throw new Error("Quantity is too large.")
  return n
}

export function formatMilliToDecimal3(milli: number): string {
  if (milli < 0) throw new Error("Invalid quantity.")
  const whole = Math.floor(milli / 1000)
  const frac = (milli % 1000).toString().padStart(3, "0").replace(/0+$/, "")
  return frac.length ? `${whole}.${frac}` : `${whole}`
}

export function sumMinor(values: bigint[]): bigint {
  let t = ZERO
  for (const v of values) t += v
  return t
}
