'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissingPresence {
  rehearsalId: number; groupId: number; groupName: string
  date: string; location: string
}

interface NextRehearsal {
  rehearsalId: number; groupId: number; groupName: string
  date: string; location: string; totalSongs: number; pendingSongs: number
}

interface GroupMessage {
  groupId: number; groupName: string; lastMessageId: number; lastMessageAt: string
}

interface WakeUpData {
  missingPresences: MissingPresence[]
  nextRehearsal: NextRehearsal | null
  groupsLatestMessage: GroupMessage[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const WAKE_THRESHOLD_MS = 15 * 60 * 1000 // 15 min d'absence avant de vérifier
const TCHAT_KEY = (gid: number) => `tchat_last_read_${gid}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function SectionCard({
  icon, color, title, children,
}: {
  icon: string; color: string; title: string; children: React.ReactNode
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-200',
    green:  'bg-green-50  border-green-200',
    pink:   'bg-pink-50   border-pink-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${bg[color] ?? bg.indigo}`}>
      <p className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </p>
      {children}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WakeUpOverlay() {
  const [data, setData]     = useState<WakeUpData | null>(null)
  const [visible, setVisible] = useState(false)
  const hiddenAtRef         = useRef<number | null>(null)

  // Vérifie les nouveaux messages tchat côté client (localStorage)
  const getNewChatGroups = (groups: GroupMessage[]) => {
    return groups.filter(g => {
      const raw = localStorage.getItem(TCHAT_KEY(g.groupId))
      if (!raw) return false // jamais ouvert = pas de badge
      const lastRead = Number(raw)
      return new Date(g.lastMessageAt).getTime() > lastRead
    })
  }

  const checkAndShow = async () => {
    try {
      const res = await fetch('/api/me/wake-up-check')
      if (!res.ok) return
      const d: WakeUpData = await res.json()

      const newChats = getNewChatGroups(d.groupsLatestMessage)
      const hasPresences = d.missingPresences.length > 0
      const hasRehearsal = !!d.nextRehearsal && d.nextRehearsal.pendingSongs > 0
      const hasChats = newChats.length > 0

      if (!hasPresences && !hasRehearsal && !hasChats) return

      setData({
        ...d,
        groupsLatestMessage: newChats, // on n'affiche que les groupes avec de nouveaux messages
      })
      setVisible(true)
    } catch {
      // silencieux — ne pas interrompre l'expérience
    }
  }

  // ── Déclencheur au login (flag posé par la page connexion) ─────────────────
  useEffect(() => {
    const pending = sessionStorage.getItem('wakeup_pending')
    if (pending) {
      sessionStorage.removeItem('wakeup_pending')
      checkAndShow()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Déclencheur au réveil (onglet redevient visible après 15 min) ───────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
      } else {
        const hiddenAt = hiddenAtRef.current
        if (hiddenAt && Date.now() - hiddenAt >= WAKE_THRESHOLD_MS) {
          checkAndShow()
        }
        hiddenAtRef.current = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible || !data) return null

  const newChats    = data.groupsLatestMessage
  const rehearsal   = data.nextRehearsal
  const presences   = data.missingPresences

  const close = () => setVisible(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">👋 Bon retour !</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Voici ce qui s&apos;est passé pendant votre absence</p>
          </div>
          <button onClick={close} className="text-indigo-200 hover:text-white transition-colors mt-0.5" aria-label="Fermer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">

          {/* 1. Présences manquantes */}
          {presences.length > 0 && (
            <SectionCard icon="📅" color="indigo" title={
              presences.length === 1
                ? 'Présence non renseignée'
                : `${presences.length} présences non renseignées`
            }>
              {presences.length === 1 ? (
                <p className="text-sm text-gray-600">
                  Vous n&apos;avez pas encore indiqué si vous serez présent à la répétition
                  {' '}<strong>{presences[0].groupName}</strong>{' '}
                  du <span className="text-indigo-700 font-medium">{fmtDate(presences[0].date)}</span>.
                </p>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1 mt-1">
                  {presences.slice(0, 3).map(p => (
                    <li key={p.rehearsalId} className="flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">·</span>
                      <span>
                        <strong>{p.groupName}</strong> —{' '}
                        <span className="text-indigo-700 font-medium capitalize">{fmtDate(p.date)}</span>
                      </span>
                    </li>
                  ))}
                  {presences.length > 3 && (
                    <li className="text-gray-400 text-xs">et {presences.length - 3} autre{presences.length - 3 > 1 ? 's' : ''}…</li>
                  )}
                </ul>
              )}
              <Link
                href={`/groupes/${presences[0].groupId}/repetitions`}
                onClick={close}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Indiquer ma présence →
              </Link>
            </SectionCard>
          )}

          {/* 2. Progression des morceaux */}
          {rehearsal && rehearsal.pendingSongs > 0 && (
            <SectionCard icon="🎼" color="green" title="Progression des morceaux">
              <p className="text-sm text-gray-600">
                La prochaine répétition <strong>{rehearsal.groupName}</strong> est prévue
                le <span className="text-green-700 font-medium capitalize">{fmtDate(rehearsal.date)}</span>.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold text-green-700">{rehearsal.pendingSongs}</span>{' '}
                morceau{rehearsal.pendingSongs > 1 ? 'x' : ''} sur {rehearsal.totalSongs} n&apos;ont pas encore de progression renseignée.
              </p>
              <Link
                href={`/groupes/${rehearsal.groupId}/repetitions/${rehearsal.rehearsalId}`}
                onClick={close}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 transition-colors"
              >
                Voir la répétition →
              </Link>
            </SectionCard>
          )}

          {/* 3. Nouveaux messages tchat */}
          {newChats.length > 0 && (
            <SectionCard icon="💬" color="pink" title={
              newChats.length === 1
                ? `Nouveaux messages dans ${newChats[0].groupName}`
                : `Nouveaux messages dans ${newChats.length} groupes`
            }>
              {newChats.length === 1 ? (
                <p className="text-sm text-gray-600">
                  De nouveaux messages ont été postés dans le tchat de <strong>{newChats[0].groupName}</strong>.
                </p>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1">
                  {newChats.map(g => (
                    <li key={g.groupId} className="flex items-center gap-1.5">
                      <span className="text-pink-400">·</span>
                      <strong>{g.groupName}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/groupes/${newChats[0].groupId}/tchat`}
                onClick={close}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-500 transition-colors"
              >
                Lire le tchat →
              </Link>
            </SectionCard>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-1">
          <button
            onClick={close}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
