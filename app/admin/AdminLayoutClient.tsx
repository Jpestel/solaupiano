'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/components/SettingsProvider'
import { SettingsProvider } from '@/components/SettingsProvider'

// Entrée autonome
const overview = { href: '/admin', label: 'Vue d\'ensemble', icon: '📊' }

// Catégories regroupant les 18 sections d'administration
const adminGroups = [
  {
    label: 'Communauté', icon: '👥',
    items: [
      { href: '/admin/utilisateurs', label: 'Utilisateurs',  icon: '👤' },
      { href: '/admin/groupes',      label: 'Groupes',       icon: '🎸' },
      { href: '/admin/instruments',  label: 'Instruments',   icon: '🎹' },
      { href: '/admin/plans',        label: 'Plans',         icon: '💳' },
    ],
  },
  {
    label: 'Contenu', icon: '📰',
    items: [
      { href: '/admin/annonces',         label: 'Annonces',            icon: '📣' },
      { href: '/admin/flash-infos',      label: 'Flash infos',         icon: '⚡' },
      { href: '/admin/newsletter',       label: 'Newsletter',          icon: '📬' },
      { href: '/admin/blog',             label: 'Blog',                icon: '✍️' },
      { href: '/admin/carrousel',        label: 'Carrousel',           icon: '🖼️' },
      { href: '/admin/tutoriels',        label: 'Tutoriels vidéo',     icon: '🎬' },
      { href: '/admin/ressources-liens', label: 'Liens de ressources', icon: '🔗' },
    ],
  },
  {
    label: 'Configuration', icon: '⚙️',
    items: [
      { href: '/admin/personnalisation', label: 'Personnalisation', icon: '🎨' },
      { href: '/admin/emails',           label: 'Emails',           icon: '📧' },
      { href: '/admin/modules',          label: 'Modules',          icon: '🧩' },
      { href: '/admin/placeholders',     label: 'Placeholders',     icon: '🔤' },
      { href: '/admin/bulles',           label: 'Bulles d\'aide',   icon: '💡' },
      { href: '/admin/rappels',          label: 'Rappels',          icon: '🔔' },
    ],
  },
  {
    label: 'Système', icon: '🛠️',
    items: [
      { href: '/admin/fichiers',    label: 'Fichiers',       icon: '📁' },
      { href: '/admin/stats',       label: 'Stats site',     icon: '📊' },
      { href: '/admin/performance', label: 'Performance',    icon: '📈' },
      { href: '/admin/usage',       label: 'Audit d\'usage', icon: '🔍' },
      { href: '/admin/support',     label: 'Support',        icon: '🛟' },
    ],
  },
]

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  const pathname = usePathname()
  const { siteIcon } = useSettings()
  const navRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname.startsWith(href)
  const groupActive = (items: { href: string }[]) => items.some((it) => isActive(it.href))
  const activeItem = (items: { href: string; label: string }[]) =>
    items.find((it) => isActive(it.href))

  // Ferme le menu déroulant au changement de page
  useEffect(() => { setOpenMenu(null) }, [pathname])

  const updateMenuPosition = (label: string) => {
    if (typeof window === 'undefined') return
    const button = buttonRefs.current[label]
    if (!button) return
    const rect = button.getBoundingClientRect()
    const viewportPadding = 12
    const width = Math.min(288, Math.max(180, window.innerWidth - viewportPadding * 2))
    const preferredLeft = window.innerWidth < 640
      ? Math.min(rect.left, window.innerWidth - width - viewportPadding)
      : rect.left
    setMenuPosition({
      top: Math.min(rect.bottom + 8, window.innerHeight - 96),
      left: Math.max(viewportPadding, Math.min(preferredLeft, window.innerWidth - width - viewportPadding)),
      width,
    })
  }

  const toggleMenu = (label: string) => {
    setOpenMenu((current) => {
      const next = current === label ? null : label
      if (next) requestAnimationFrame(() => updateMenuPosition(next))
      else setMenuPosition(null)
      return next
    })
  }

  useEffect(() => {
    if (!openMenu) {
      setMenuPosition(null)
      return
    }
    updateMenuPosition(openMenu)
    const onReposition = () => updateMenuPosition(openMenu)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [openMenu])

  // Ferme au clic extérieur / touche Échap
  useEffect(() => {
    if (!openMenu) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      const inNav = navRef.current?.contains(target)
      const inMenu = menuRef.current?.contains(target)
      const inMobileMenu = mobileMenuRef.current?.contains(target)
      if (!inNav && !inMenu && !inMobileMenu) setOpenMenu(null)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenu(null) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête admin (plein largeur, sans menu latéral) */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-sm">{siteIcon}</span>
            </div>
            <span className="font-bold text-indigo-900 text-base truncate">Sol au piano</span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 rounded-full px-2 py-0.5 flex-shrink-0">Admin</span>
          </div>
          <Link
            href="/tableau-de-bord"
            className="inline-flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Retour à l&apos;app</span>
          </Link>
        </div>
      </header>

      <main>
        <div className="mx-auto w-full max-w-6xl px-3 py-5 pb-10 sm:px-6 sm:py-8">

            {/* Admin sub-nav — catégories déroulantes */}
            <nav className="relative z-20 mb-6 -mx-3 overflow-x-auto border-b border-gray-200 px-3 pb-3 sm:mx-0 sm:px-0">
              <div ref={navRef} className="flex min-w-max items-center gap-1.5 sm:min-w-0 sm:flex-wrap">
                <span className="hidden text-xs font-semibold uppercase tracking-wider text-gray-400 sm:mr-1 sm:inline sm:flex-shrink-0">Admin</span>

                {/* Entrée autonome : Vue d'ensemble */}
                <Link
                  href={overview.href}
                  className={`flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive(overview.href)
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="text-[15px] leading-none">{overview.icon}</span>
                  {overview.label}
                </Link>

                {/* Catégories déroulantes */}
                {adminGroups.map((g) => {
                  const active = groupActive(g.items)
                  const open = openMenu === g.label
                  const current = activeItem(g.items)
                  return (
                    <div key={g.label} className="relative flex-shrink-0">
                      <button
                        ref={(node) => { buttonRefs.current[g.label] = node }}
                        type="button"
                        onClick={() => toggleMenu(g.label)}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        aria-controls={open ? `admin-menu-${g.label}` : undefined}
                        className={`flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : open
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="text-[15px] leading-none">{g.icon}</span>
                        {g.label}
                        {/* Pastille : sous-page active de la catégorie */}
                        {active && current && (
                          <span className="hidden sm:inline text-[11px] font-normal text-white/80">· {current.label}</span>
                        )}
                        <svg
                          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''} ${active ? 'text-white/70' : 'text-gray-400'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            </nav>

            {openMenu && (() => {
              const group = adminGroups.find((item) => item.label === openMenu)
              if (!group) return null
              return (
                <div ref={mobileMenuRef} className="-mt-3 mb-6 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg ring-1 ring-black/5 sm:hidden">
                  <div className="mb-1 flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                    <span className="text-base leading-none">{group.icon}</span>
                    <span className="text-sm font-bold text-gray-900">{group.label}</span>
                  </div>
                  <div className="grid gap-1">
                    {group.items.map((it) => (
                      <Link
                        key={it.href}
                        href={it.href}
                        role="menuitem"
                        onClick={() => setOpenMenu(null)}
                        className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isActive(it.href)
                            ? 'bg-indigo-50 font-semibold text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-6 text-center text-base leading-none">{it.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{it.label}</span>
                        {isActive(it.href) && (
                          <svg className="h-4 w-4 flex-shrink-0 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })()}

            {openMenu && menuPosition && typeof document !== 'undefined' && createPortal((() => {
              const group = adminGroups.find((item) => item.label === openMenu)
              if (!group) return null
              return (
                <div
                  ref={menuRef}
                  id={`admin-menu-${group.label}`}
                  role="menu"
                  className="fixed z-[1000] hidden max-h-[min(70dvh,28rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-[fadeIn_0.12s_ease-out] sm:block"
                  style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
                >
                  <div className="mb-1 flex items-center gap-2 border-b border-gray-100 px-3 py-2 sm:hidden">
                    <span className="text-base leading-none">{group.icon}</span>
                    <span className="text-sm font-bold text-gray-900">{group.label}</span>
                  </div>
                  {group.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      role="menuitem"
                      onClick={() => setOpenMenu(null)}
                      className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isActive(it.href)
                          ? 'bg-indigo-50 font-semibold text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="w-6 text-center text-base leading-none">{it.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                      {isActive(it.href) && (
                        <svg className="h-4 w-4 flex-shrink-0 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </Link>
                  ))}
                </div>
              )
            })(), document.body)}

            {children}
          </div>
        </main>
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
