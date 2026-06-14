'use client'

import { useState } from 'react'
import Link from 'next/link'

const LINKS = [
  { href: '/annonces', label: 'Annonces' },
  { href: '/blog', label: 'Blog' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/aide', label: 'Aide' },
]

export function PublicNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative flex items-center gap-3">
      {/* Desktop : liens en ligne */}
      <nav className="hidden sm:flex items-center gap-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">
            {l.label}
          </Link>
        ))}
        <Link href="/connexion" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
          Se connecter
        </Link>
        <Link href="/inscription" className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
          S&apos;inscrire
        </Link>
      </nav>

      {/* Mobile : inscription rapide + burger */}
      <div className="flex sm:hidden items-center gap-2">
        <Link href="/inscription" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
          S&apos;inscrire
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors active:scale-95"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>

      {/* Panneau déroulant mobile */}
      {open && (
        <>
          <div className="sm:hidden fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="sm:hidden absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-xl py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-1.5 border-t border-gray-100" />
            <Link
              href="/connexion"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              Se connecter
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
