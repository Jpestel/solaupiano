'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Associe la page courante (côté usage) à l'outil de configuration admin du module.
// Retourne null quand aucune config dédiée n'existe → le bouton ne s'affiche pas.
function configForPath(pathname: string): { href: string; label: string } | null {
  if (pathname === '/tableau-de-bord') return { href: '/admin', label: 'Vue d’ensemble' }
  if (pathname === '/annonces' || pathname.startsWith('/annonces/')) return { href: '/admin/annonces', label: 'Annonces' }
  if (pathname === '/groupes' || pathname.startsWith('/groupes/')) return { href: '/admin/groupes', label: 'Groupes' }
  if (pathname.startsWith('/outils')) return { href: '/admin/modules', label: 'Modules & outils' }
  if (pathname.startsWith('/assistance')) return { href: '/admin/support', label: 'Support' }
  return null
}

// Bouton flottant réservé à l'admin : raccourci contextuel vers la config du module affiché.
export function AdminConfigButton() {
  const { data: session } = useSession()
  const pathname = usePathname()

  if (session?.user?.siteRole !== 'ADMIN') return null
  const cfg = configForPath(pathname || '')
  if (!cfg) return null

  return (
    <Link
      href={cfg.href}
      title={`Configurer : ${cfg.label}`}
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 active:scale-95 transition-all"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span>Configurer<span className="hidden sm:inline"> · {cfg.label}</span></span>
    </Link>
  )
}
