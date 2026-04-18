/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/:businessSlug/catalog/add-ons",
        destination: "/:businessSlug/catalog/categories",
        permanent: true,
      },
    ]
  },
  images: {
    // Branding and catalog images are arbitrary https URLs, same-origin `/uploads/…`, or `blob:` previews.
    // Without this, `next/image` rejects hosts outside `remotePatterns`.
    unoptimized: true,
  },
}

export default nextConfig
