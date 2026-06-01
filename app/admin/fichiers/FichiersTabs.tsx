'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/admin/fichiers', label: '📁 Tous les fichiers' },
  { href: '/admin/fichiers/orphelins', label: '🧹 Fichiers orphelins' },
]

export function FichiersTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 mb-5 border-b border-gray-200">
      {tabs.map((t) => {
        const active = pathname === t.href
        return (
          <Link key={t.href} href={t.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
