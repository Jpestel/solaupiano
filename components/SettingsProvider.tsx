'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface Settings {
  siteIcon: string
  colorTheme: string
}

const SettingsContext = createContext<Settings>({ siteIcon: '🎶', colorTheme: 'indigo' })

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ siteIcon: '🎶', colorTheme: 'indigo' })

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSettings(data) })
      .catch(() => {})
  }, [])

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
