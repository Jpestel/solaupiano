'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Sidebar } from '@/components/Sidebar'
import HelpBubbleLayer from '@/components/HelpBubbleLayer'
import { SettingsProvider, useSettings } from '@/components/SettingsProvider'
import { WakeUpOverlay } from '@/components/WakeUpOverlay'
import { FlashInfo } from '@/components/FlashInfo'
import { UsageTracker } from '@/components/UsageTracker'
import { AdminConfigButton } from '@/components/AdminConfigButton'
import { PreviewBanner } from '@/components/PreviewBanner'

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { siteIcon } = useSettings()

  // Persist collapsed state in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setSidebarCollapsed(true)
  }, [])

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev))
      return !prev
    })
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-white">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <PreviewBanner />
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-700 transition-colors hover:bg-gray-50 active:scale-95"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden text-sm font-medium min-[390px]:inline">Menu</span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-sm">{siteIcon}</span>
            </div>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-base font-bold text-indigo-900">Sol au piano</span>
              <span className="truncate text-[10px] font-normal italic text-indigo-400">du solo à l&apos;orchestre</span>
            </div>
          </div>

          {/* Déconnexion rapide (mobile) */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95"
            aria-label="Se déconnecter"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden text-sm font-medium min-[430px]:inline">Quitter</span>
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="relative mx-auto w-full max-w-6xl px-3 py-5 pb-10 sm:px-6 sm:py-8 lg:pb-8">
            {children}
            <HelpBubbleLayer />
          </div>
        </main>
      </div>

      <WakeUpOverlay />
      <FlashInfo />
      <UsageTracker />
      <AdminConfigButton />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SettingsProvider>
  )
}
