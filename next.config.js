/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/AI-Company-OS',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
