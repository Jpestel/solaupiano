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
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const themeCss = getThemeCss(settings.colorTheme)
  const phOverrides = await getPlaceholderOverrides()
  // Applique côté serveur immédiatement (pour les rendus SSR des formulaires)
  setPlaceholders(phOverrides)

  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <PlaceholderInit values={phOverrides} />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
