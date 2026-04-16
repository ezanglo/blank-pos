import { getStoreBranding } from "@/lib/queries/store-branding"

/** Public read for `/login` — uses shared `store_branding` row. */
export type LoginBranding = {
  displayName: string | null
  tagline: string | null
  logoImageUrl: string | null
  loginBackgroundImageUrl: string | null
} | null

export async function getLoginBranding(): Promise<LoginBranding> {
  const b = await getStoreBranding()
  if (!b) return null
  return {
    displayName: b.displayName,
    tagline: b.tagline,
    logoImageUrl: b.logoImageUrl,
    loginBackgroundImageUrl: b.loginBackgroundImageUrl,
  }
}
