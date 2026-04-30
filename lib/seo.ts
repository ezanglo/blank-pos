import type { Metadata } from "next"

import type { BusinessDetails } from "@/lib/db/schema-app"

/** Business display name for nested `title` template (`%s · …`); fallback when unset in DB. */
const SITE_LABEL_FALLBACK = "Business"

/** Public app name — default `<title>`, `/login`, and global app/chrome metadata (not per-store branding). */
export const APP_PRODUCT_NAME = "Blank POS"

export const DEFAULT_DESCRIPTION =
  "Multi-tenant store operations—organizations, team roles, and branding—for point-of-sale workflows."

/**
 * Canonical origin for relative Open Graph / Twitter URLs.
 * Set `NEXT_PUBLIC_APP_URL` in production (e.g. https://pos.example.com).
 * On Vercel, `VERCEL_URL` is used as a fallback when the public URL is unset.
 */
export function getMetadataBase(): URL | undefined {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) {
    try {
      return new URL(explicit)
    } catch {
      // ignore invalid URL
    }
  }
  const vercel = process.env.VERCEL_URL
  if (vercel) {
    try {
      return new URL(`https://${vercel}`)
    } catch {
      return undefined
    }
  }
  return undefined
}

/** Authenticated product surface — avoid indexing tenant paths and auth screens. */
export const privateAppRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
}

function siteLabelFromOrg(
  branding: Pick<BusinessDetails, "displayName"> | null,
  organizationName: string,
): string {
  const display = branding?.displayName?.trim()
  if (display && display.length > 0) return display
  const name = organizationName.trim()
  if (name.length > 0) return name
  return SITE_LABEL_FALLBACK
}

function descriptionFromBranding(branding: Pick<BusinessDetails, "tagline"> | null): string {
  const tagline = branding?.tagline?.trim()
  return tagline && tagline.length > 0 ? tagline : DEFAULT_DESCRIPTION
}

/** App-wide fallback (routes outside `/{businessSlug}/…`). No tenant branding. */
export function buildGlobalRootMetadata(): Metadata {
  return {
    metadataBase: getMetadataBase(),
    applicationName: APP_PRODUCT_NAME,
    title: APP_PRODUCT_NAME,
    description: DEFAULT_DESCRIPTION,
    robots: privateAppRobots,
  }
}

/** Metadata under `/(protected)/(org)/[businessSlug]` — uses that org's branding / name. */
export function buildOrgScopedMetadata(
  branding: BusinessDetails | null,
  organizationName: string,
): Metadata {
  const label = siteLabelFromOrg(branding, organizationName)
  const description = descriptionFromBranding(branding)
  return {
    applicationName: label,
    title: {
      default: label,
      template: `%s · ${label}`,
    },
    description,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: label,
      title: label,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: label,
      description,
    },
    robots: privateAppRobots,
  }
}

const AUTH_LAYOUT_DESCRIPTION =
  "Sign in or create a Blank POS account with your email and password. Private workspace for your business."

/** Shared metadata for `/login` and `/signup` under `(auth)` (noindex). */
export function buildAuthLayoutMetadata(): Metadata {
  const titleAbsolute = APP_PRODUCT_NAME

  return {
    title: {
      absolute: titleAbsolute,
    },
    description: AUTH_LAYOUT_DESCRIPTION,
    applicationName: APP_PRODUCT_NAME,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: APP_PRODUCT_NAME,
      title: titleAbsolute,
      description: AUTH_LAYOUT_DESCRIPTION,
    },
    twitter: {
      card: "summary",
      title: titleAbsolute,
      description: AUTH_LAYOUT_DESCRIPTION,
    },
    robots: privateAppRobots,
  }
}
