'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { clsx } from '@/lib/utils'
import { useSettings } from './SettingsProvider'

const navItems = [
  {
    href: '/',
    label: 'Accueil du site',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/tableau-de-bord',
    label: 'Tableau de bord',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/groupes',
    label: 'Mes groupes',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/profil',
    label: 'Mon profil',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: '/calendrier',
    label: 'Calendrier',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/outils/accords',
    label: 'Accords',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    href: '/outils/accordeur',
    label: 'Accordeur',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    href: '/outils/metronome',
    label: 'Métronome',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2 7h5l-4 3 2 7-5-3-5 3 2-7-4-3h5z" />
      </svg>
    ),
  },
  {
    href: '/outils/portee',
    label: 'Portée',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 9h16M4 13h16M4 17h16" />
      </svg>
    ),
  },
  {
    href: '/outils/cachet',
    label: 'Cachet GUSO',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/outils/kilometrique',
    label: 'Estim. cachet',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    href: '/outils/video-audio',
    label: 'Vidéo → MP3',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4M3 16h4M17 8h4M17 16h4M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
      </svg>
    ),
  },
  {
    href: '/outils/wav-mp3',
    label: 'WAV → MP3',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l11-2v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm11-3a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h4M4 8h4M4 11h3" />
      </svg>
    ),
  },
  {
    href: '/outils/partition',
    label: 'Lecteur partition',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l11-2v13M9 19a3 3 0 11-6 0 3 3 0 016 0zm11-3a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/annonces',
    label: 'Annonces',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    href: '/annonces/mes-annonces',
    label: 'Mes annonces',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/blog',
    label: 'Blog',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m-6 12h6a2 2 0 002-2v-7a2 2 0 00-2-2h-2v4l-2-1-2 1V7H9a2 2 0 00-2 2v9a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/aide',
    label: 'Aide',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/assistance',
    label: 'Assistance',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ open = false, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { siteIcon } = useSettings()

  const isActive = (href: string) =>
    href === '/tableau-de-bord' || href === '/admin' || href === '/' ? pathname === href : pathname.startsWith(href)

  const userInitial = session?.user?.name?.charAt(0).toUpperCase() || '?'

  const content = (
    <aside className={clsx(
      'h-screen sticky top-0 bg-gray-100 border-r border-gray-200 flex flex-col overflow-hidden transition-[width] duration-200 ease-in-out',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={clsx(
        'flex-shrink-0 border-b border-gray-200 flex items-center overflow-hidden',
        collapsed ? 'px-3 py-5 justify-center' : 'px-6 py-5 justify-between'
      )}>
        <Link
          href="/tableau-de-bord"
          onClick={onClose}
          title={collapsed ? 'Sol au piano' : undefined}
          className={clsx('flex items-center gap-3', collapsed && 'justify-center')}
        >
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow flex-shrink-0">
            <span className="text-lg">{siteIcon}</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-indigo-900 text-lg leading-tight whitespace-nowrap">Sol au piano</span>
          )}
        </Link>
        {/* Close button on mobile */}
        {!collapsed && onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-gray-200 text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav — scrollable */}
      <nav className={clsx('flex-1 overflow-y-auto py-4 space-y-1', collapsed ? 'px-2' : 'px-3')}>
        {navItems
          .filter((item) => item.href === '/groupes' ? session?.user?.siteRole !== 'ADMIN' : true)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5',
                isActive(item.href)
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              )}
            >
              <span className={isActive(item.href) ? 'text-white' : 'text-gray-500'}>{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          ))}

      </nav>

      {/* User footer */}
      <div className={clsx('flex-shrink-0 border-t border-gray-200', collapsed ? 'px-2 py-3' : 'px-4 py-4')}>
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
              {session?.user?.image
                ? <img src={session.user.image} alt={session.user.name || ''} className="w-full h-full object-cover" />
                : userInitial
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
          </div>
        )}

        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            {/* Avatar only */}
            <div
              className="w-8 h-8 rounded-full overflow-hidden bg-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0"
              title={session?.user?.name || ''}
            >
              {session?.user?.image
                ? <img src={session.user.image} alt={session.user.name || ''} className="w-full h-full object-cover" />
                : userInitial
              }
            </div>
            {/* Disconnect */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Se déconnecter"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-red-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Se déconnecter
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden lg:flex relative">
        {content}
        {/* Collapse toggle — placé dans le conteneur (non clippé), discret */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
            aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
            className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors z-10"
          >
            <svg className={clsx('w-2.5 h-2.5 transition-transform duration-200', collapsed ? 'rotate-0' : 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />
          <div className="relative z-50 flex">{content}</div>
        </div>
      )}
    </>
  )
}
