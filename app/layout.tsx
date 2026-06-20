import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { getSiteSettings } from '@/lib/site-settings'
import { getThemeCss } from '@/lib/themes'
import { getPlaceholderOverrides } from '@/lib/placeholders-server'
import { setPlaceholders } from '@/lib/placeholders'
import { PlaceholderInit } from '@/components/PlaceholderInit'

export const metadata: Metadata = {
  title: 'Sol au piano',
  description: 'Plateforme de gestion de répétitions musicales',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/favicon.svg?v=3', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png?v=3', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-192x192.png?v=3', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' }],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const themeCss = getThemeCss(settings.colorTheme)
  const phOverrides = await getPlaceholderOverrides()
  // Applique côté serveur immédiatement (pour les rendus SSR des formulaires)
  setPlaceholders(phOverrides)

  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico?v=4" sizes="any" />
        <link rel="icon" href="/favicon.svg?v=4" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon-32x32.png?v=4" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest?v=4" />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <PlaceholderInit values={phOverrides} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
