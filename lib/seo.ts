import type { Metadata } from "next"

import type { StoreBranding } from "@/lib/db/schema-app"

/** Shown in titles and Open Graph until `store_branding.display_name` is set. */
const SITE_LABEL_FALLBACK = "Store"

export const DEFAULT_DESCRIPTION =
  "Multi-tenant store operations—organizations, staff roles, and branding—for point-of-sale workflows."

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

function siteLabelFromBranding(branding: Pick<StoreBranding, "displayName"> | null): string {
  const name = branding?.displayName?.trim()
  return name && name.length > 0 ? name : SITE_LABEL_FALLBACK
}

function descriptionFromBranding(branding: Pick<StoreBranding, "tagline"> | null): string {
  const tagline = branding?.tagline?.trim()
  return tagline && tagline.length > 0 ? tagline : DEFAULT_DESCRIPTION
}

export function buildRootMetadataFromBranding(branding: StoreBranding | null): Metadata {
  const label = siteLabelFromBranding(branding)
  const description = descriptionFromBranding(branding)
  return {
    metadataBase: getMetadataBase(),
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
