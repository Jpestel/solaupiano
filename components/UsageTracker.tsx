'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Trace la navigation de l'utilisateur connecté (audit d'usage).
// Envoie le pathname à /api/track à chaque changement de page (sans bloquer).
export function UsageTracker() {
  const pathname = usePathname()
  const { status } = useSession()
  const last = useRef<string>('')

  useEffect(() => {
    if (status !== 'authenticated' || !pathname) return
    if (pathname === last.current) return
    last.current = pathname
    // Ne bloque jamais le rendu ; on ignore les erreurs
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname, status])

  return null
}
