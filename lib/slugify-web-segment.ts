const slugSegmentRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Derives a URL-safe segment (store slug or location slug) from a human-readable name:
 * lowercased, non-alphanumeric runs collapsed to `-`, leading/trailing `-` stripped.
 * Ensures length ≥ 2 and matches `[a-z0-9]+(?:-[a-z0-9]+)*`.
 */
export function slugifyWebSegmentFromName(name: string): string {
  const trimmed = name.trim().toLowerCase()
  const ascii = trimmed
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")

  let base = ascii.length > 0 ? ascii : "store"
  while (base.length < 2) {
    base = `${base}x`
  }
  if (!slugSegmentRegex.test(base)) {
    base = base
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "store"
    while (base.length < 2) base = `${base}x`
  }
  return base
}
