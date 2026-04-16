import type { MetadataRoute } from "next"

/**
 * No public marketing URLs yet; home redirects into the app.
 * Keeps `/sitemap.xml` valid without advertising private routes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return []
}
