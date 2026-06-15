'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import HelpBubbleLayer from '@/components/HelpBubbleLayer'
import { SettingsProvider, useSettings } from '@/components/SettingsProvider'
import { WakeUpOverlay } from '@/components/WakeUpOverlay'
import { FlashInfo } from '@/components/FlashInfo'
import { UsageTracker } from '@/components/UsageTracker'
import { AdminConfigButton } from '@/components/AdminConfigButton'

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
    <div className="flex min-h-screen bg-white">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors active:scale-95"
            aria-label="Ouvrir le menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-sm font-medium">Menu</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-sm">{siteIcon}</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-indigo-900 text-base">Sol au piano</span>
              <span className="text-[10px] text-indigo-400 italic font-normal">du solo à l&apos;orchestre</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-10 lg:pb-8">
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
