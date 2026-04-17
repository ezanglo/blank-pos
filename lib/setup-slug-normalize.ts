/** URL segment for store (`organization.slug`) or branch (`location.slug`). */
export const SETUP_WEB_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Returns normalized slug or `null` if empty / invalid (client + server). */
export function normalizeSetupWebSlug(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (s.length < 2 || !SETUP_WEB_SLUG_REGEX.test(s)) return null
  return s
}
