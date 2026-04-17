import tailwindColors from "tailwindcss/colors"

const BRANDING_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function isShadeRecord(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null) return false
  return "500" in v && typeof (v as Record<string, string>)["500"] === "string"
}

/** Color names from Tailwind default palette (slate, red, …) — each has shade keys 50–950. */
export const BRAND_TAILWIND_FAMILIES = (
  Object.keys(tailwindColors) as (keyof typeof tailwindColors)[]
)
  .filter((k) => isShadeRecord(tailwindColors[k]))
  .sort()

/** Shade keys present on typical palette rows (derived from `red`). */
export const BRAND_TAILWIND_SHADES = Object.keys(tailwindColors.red)
  .filter((k) => /^\d+$/.test(k))
  .sort((a, b) => Number(a) - Number(b)) as string[]

/**
 * Returns normalized `#rrggbb` for valid hex input, or `null`.
 */
export function brandingHexForCss(value: string | null | undefined): string | null {
  const t = value?.trim()
  if (!t) return null
  if (!BRANDING_HEX.test(t)) return null
  if (t.length === 4) {
    const r = t[1]!
    const g = t[2]!
    const b = t[3]!
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return t.toLowerCase()
}

/**
 * Resolves a stored brand color to a CSS color value for `background-color` / custom properties:
 * - `#RGB` / `#RRGGBB` → normalized hex
 * - `red-500`, `emerald-200` → Tailwind default palette (OKLCH strings from `tailwindcss/colors`)
 */
export function resolveBrandColorToCss(value: string | null | undefined): string | null {
  const t = value?.trim()
  if (!t) return null
  const hex = brandingHexForCss(t)
  if (hex) return hex

  const m = t.match(/^([a-z]+)-(\d{2,3})$/i)
  if (!m) return null
  const family = m[1]!.toLowerCase()
  const shade = m[2]!
  const raw = (tailwindColors as unknown as Record<string, unknown>)[family]
  if (!isShadeRecord(raw)) return null
  const css = raw[shade]
  if (typeof css !== "string") return null
  if (css === "inherit" || css === "currentColor" || css === "transparent") return null
  return css
}
