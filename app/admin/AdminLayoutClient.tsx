'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { BottomNav } from '@/components/BottomNav'
import { useSettings } from '@/components/SettingsProvider'
import { SettingsProvider } from '@/components/SettingsProvider'

const adminNav = [
  { href: '/admin',                  label: 'Vue d\'ensemble' },
  { href: '/admin/instruments',      label: 'Instruments' },
  { href: '/admin/utilisateurs',     label: 'Utilisateurs' },
  { href: '/admin/groupes',          label: 'Groupes' },
  { href: '/admin/plans',            label: 'Plans' },
  { href: '/admin/rappels',          label: 'Rappels' },
  { href: '/admin/personnalisation', label: 'Personnalisation' },
  { href: '/admin/placeholders',     label: 'Placeholders' },
  { href: '/admin/tutoriels',       label: 'Tutoriels vidéo' },
  { href: '/admin/flash-infos',      label: 'Flash infos' },
  { href: '/admin/newsletter',       label: 'Newsletter' },
  { href: '/admin/blog',             label: 'Blog' },
  { href: '/admin/ressources-liens',  label: 'Liens de ressources' },
  { href: '/admin/carrousel',        label: 'Carrousel' },
  { href: '/admin/fichiers',         label: 'Fichiers' },
  { href: '/admin/performance',      label: 'Performance' },
  { href: '/admin/usage',            label: 'Audit d\'usage' },
]

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { siteIcon } = useSettings()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-sm">{siteIcon}</span>
            </div>
            <span className="font-bold text-indigo-900 text-base">Sol au piano</span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8">

            {/* Admin sub-nav — scrollable horizontally on mobile */}
            <div className="mb-6 -mx-4 sm:mx-0">
              <div className="flex items-center gap-1 border-b border-gray-200 pb-3 px-4 sm:px-0 overflow-x-auto scrollbar-hide">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-2 flex-shrink-0">Admin</span>
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive(item.href)
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SettingsProvider>
  )
}
