const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['formidable', 'sharp'],
    staleTimes: {
      dynamic: 0,   // pages dynamiques toujours fraîches
      static: 180,  // pages statiques cachées 3 min
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    return config
  },
}
module.exports = nextConfig
