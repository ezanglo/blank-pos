/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Allow LAN devices (e.g. tablet POS) and numeric localhost during `next dev`.
  // Wildcards match hostname labels per Next.js CSRF-style origin rules.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],
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
