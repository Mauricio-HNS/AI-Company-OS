/** @type {import('next').NextConfig} */
const nextConfig = {
  // DASH 1 authentication requires a server runtime. GitHub Pages remains a static preview only.
  images: { unoptimized: true },
}
module.exports = nextConfig
