import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { getSiteSettings } from '@/lib/site-settings'
import { getThemeCss } from '@/lib/themes'

export const metadata: Metadata = {
  title: 'Solaupiano',
  description: 'Plateforme de gestion de répétitions musicales',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const themeCss = getThemeCss(settings.colorTheme)

  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
