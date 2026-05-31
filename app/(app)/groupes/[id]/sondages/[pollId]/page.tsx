'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Status = 'PRESENT' | 'ABSENT' | 'INCERTAIN'
interface Vote { userId: number; name: string; status: Status }
interface Option { id: number; date: string; note: string | null; votes: Vote[] }
interface Member { userId: number; name: string; role: string }
interface PollData {
  poll: { id: number; groupId: number; title: string; description: string | null; closed: boolean; createdById: number | null }
  options: Option[]
  members: Member[]
  isChef: boolean
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
}
const STATUS_META: Record<Status, { icon: string; cls: string; label: string }> = {
  PRESENT: { icon: '✅', cls: 'bg-green-100 text-green-700 border-green-300', label: 'Présent' },
  ABSENT: { icon: '⛔', cls: 'bg-red-100 text-red-700 border-red-300', label: 'Absent' },
  INCERTAIN: { icon: '❓', cls: 'bg-amber-100 text-amber-700 border-amber-300', label: 'Incertain' },
}
const ORDER: Status[] = ['PRESENT', 'INCERTAIN', 'ABSENT']

export default function PollDetailPage({ params }: { params: { id: string; pollId: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const groupId = params.id
  const pollId = params.pollId
  const myId = Number(session?.user?.id)

  const [data, setData] = useState<PollData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/sondages/${pollId}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [pollId])
  useEffect(() => { if (session) load() }, [session, load])

  const vote = async (optionId: number, status: Status) => {
    // maj optimiste
    setData((d) => {
      if (!d) return d
      return {
        ...d,
        options: d.options.map((o) => o.id !== optionId ? o : {
          ...o,
          votes: [...o.votes.filter((v) => v.userId !== myId), { userId: myId, name: session?.user?.name || 'Moi', status }],
        }),
      }
    })
    await fetch(`/api/sondages/${pollId}/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId, status }),
    })
  }

  const toggleClose = async () => {
    if (!data) return
    await fetch(`/api/sondages/${pollId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closed: !data.poll.closed }),
    })
    load()
  }
  const del = async () => {
    if (!confirm('Supprimer ce sondage ?')) return
    await fetch(`/api/sondages/${pollId}`, { method: 'DELETE' })
    router.push(`/groupes/${groupId}/sondages`)
  }

  if (loading) return <div className="text-gray-500 p-6">Chargement...</div>
  if (!data) return <div className="text-gray-500 p-6">Sondage introuvable.</div>

  const { poll, options, members } = data
  const closed = poll.closed
  const myStatus = (o: Option): Status | null => o.votes.find((v) => v.userId === myId)?.status ?? null
  const count = (o: Option, s: Status) => o.votes.filter((v) => v.status === s).length
  const bestPresent = Math.max(0, ...options.map((o) => count(o, 'PRESENT')))

  // Membres ayant voté au moins une fois
  const votedIds = new Set(options.flatMap((o) => o.votes.map((v) => v.userId)))
  const notVoted = members.filter((m) => !votedIds.has(m.userId))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link><span>/</span>
        <Link href={`/groupes/${groupId}`} className="hover:text-indigo-600">Groupe</Link><span>/</span>
        <Link href={`/groupes/${groupId}/sondages`} className="hover:text-indigo-600">Sondages</Link><span>/</span>
        <span className="text-gray-900 truncate max-w-[140px]">{poll.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📊 {poll.title} {closed && <span className="text-xs rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 font-normal">clôturé</span>}
          </h1>
          {poll.description && <p className="text-gray-500 text-sm mt-1">{poll.description}</p>}
        </div>
        {data.isChef && (
          <div className="flex items-center gap-2">
            <button onClick={toggleClose} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              {closed ? 'Rouvrir' : 'Clôturer'}
            </button>
            <button onClick={del} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">Supprimer</button>
          </div>
        )}
      </div>

      {/* Ma réponse */}
      {!closed && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 mb-5">
          <h2 className="text-sm font-bold text-indigo-800 mb-3">Ma réponse</h2>
          <div className="space-y-2">
            {options.map((o) => {
              const mine = myStatus(o)
              return (
                <div key={o.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {fmtDate(o.date)}{o.note && <span className="text-gray-400 font-normal"> · {o.note}</span>}
                  </span>
                  <div className="flex gap-1">
                    {ORDER.map((s) => {
                      const active = mine === s
                      const m = STATUS_META[s]
                      return (
                        <button key={s} onClick={() => vote(o.id, s)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${active ? m.cls : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                          {m.icon} {m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Résultats */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 font-medium text-gray-500 sticky left-0 bg-gray-50 z-10">Membre</th>
              {options.map((o) => {
                const best = count(o, 'PRESENT') === bestPresent && bestPresent > 0
                return (
                  <th key={o.id} className={`px-3 py-2 text-center font-medium capitalize whitespace-nowrap ${best ? 'text-green-700' : 'text-gray-500'}`}>
                    {best && <span title="Meilleure date">⭐ </span>}{fmtDate(o.date)}
                    {o.note && <div className="text-[10px] text-gray-400 font-normal normal-case">{o.note}</div>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {members.map((mem) => (
              <tr key={mem.userId} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-700 sticky left-0 bg-white z-10 whitespace-nowrap">
                  {mem.userId === myId ? <strong>{mem.name} (moi)</strong> : mem.name}
                </td>
                {options.map((o) => {
                  const v = o.votes.find((x) => x.userId === mem.userId)
                  return (
                    <td key={o.id} className="px-3 py-2 text-center">
                      {v ? <span title={STATUS_META[v.status].label}>{STATUS_META[v.status].icon}</span> : <span className="text-gray-300">–</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Totaux */}
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
              <td className="px-3 py-2 text-gray-600 sticky left-0 bg-gray-50 z-10">Totaux</td>
              {options.map((o) => (
                <td key={o.id} className="px-3 py-2 text-center whitespace-nowrap">
                  <span className="text-green-700">✅{count(o, 'PRESENT')}</span>{' '}
                  <span className="text-amber-600">❓{count(o, 'INCERTAIN')}</span>{' '}
                  <span className="text-red-600">⛔{count(o, 'ABSENT')}</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {notVoted.length > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          N&apos;ont pas encore répondu : {notVoted.map((m) => m.name).join(', ')}
        </p>
      )}
    </div>
  )
}
