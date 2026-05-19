/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['formidable'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}
module.exports = nextConfig
