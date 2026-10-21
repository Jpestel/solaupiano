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
  // Sol au piano est gratuit : il n'y a plus de page de tarifs. L'adresse est
  // conservée pour que les anciens liens (e-mails, favoris) arrivent sur les
  // fonctionnalités. Déclarée ici plutôt que par redirect() dans une page : Next
  // pré-calcule une telle page à la compilation et la fige en une réponse 307
  // sans destination.
  async redirects() {
    return [{ source: '/tarifs', destination: '/fonctionnalites', permanent: false }]
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
