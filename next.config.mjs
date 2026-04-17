/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Branding and catalog images are arbitrary https URLs, same-origin `/uploads/…`, or `blob:` previews.
    // Without this, `next/image` rejects hosts outside `remotePatterns`.
    unoptimized: true,
  },
}

export default nextConfig
