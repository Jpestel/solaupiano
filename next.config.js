/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['formidable'],
  typescript: {
    ignoreBuildErrors: true,
  },
}
module.exports = nextConfig
