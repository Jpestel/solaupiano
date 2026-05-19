'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDateWithDay, getResourceIcon } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { AttendanceBadge } from '@/components/ui/Badge'
import { AttendanceButton } from '@/components/AttendanceButton'

interface Resource {
  id: number
  name: string
  type: string
  filePath: string
  fileSize?: number
}

interface Song {
  id: number
  title: string
  artist?: string
  resources: Resource[]
}

interface Attendance {
  userId: number
  status: 'PRESENT' | 'ABSENT' | 'INCERTAIN'
  user: { id: number; name: string }
}

interface Rehearsal {
  id: number
  date: string
  location: string
  startTime: string
  endTime?: string
  notes?: string
  groupId: number
  songs: { song: Song }[]
  attendances: Attendance[]
}

interface GroupInfo {
  name: string
  groupRole: string
}

interface GroupSong {
  id: number
  title: string
  artist?: string
}

export default function RepetitionDetailPage({
  params,
}: {
  params: { id: string; repId: string }
}) {
  const { data: session } = useSession()
  const [rehearsal, setRehearsal] = useState<Rehearsal | null>(null)
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [groupSongs, setGroupSongs] = useState<GroupSong[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [expandedSongIds, setExpandedSongIds] = useState<Set<number>>(new Set())

  const toggleResources = (songId: number) => {
    setExpandedSongIds((prev) => {
      const next = new Set(prev)
      next.has(songId) ? next.delete(songId) : next.add(songId)
      return next
    })
  }

  const fetchData = async () => {
    const [repRes, grpRes, songsRes] = await Promise.all([
      fetch(`/api/repetitions/${params.repId}`),
      fetch(`/api/groupes/${params.id}`),
      fetch(`/api/groupes/${params.id}/morceaux`),
    ])
    if (repRes.ok) setRehearsal(await repRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session?.user?.id))
      const role = session?.user?.siteRole === 'ADMIN' ? 'CHEF' : (me?.groupRole || 'MEMBRE')
      setGroupInfo({ name: g.name, groupRole: role })
    }
    if (songsRes.ok) setGroupSongs(await songsRes.json())
    setLoading(false)
  }

  useEffect(() => { if (session) fetchData() }, [session, params.repId])

  const addSong = async (songId: number) => {
    setAddingId(songId)
    await fetch(`/api/repetitions/${params.repId}/morceaux`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })
    setAddingId(null)
    fetchData()
  }

  const removeSong = async (songId: number) => {
    setRemovingId(songId)
    await fetch(`/api/repetitions/${params.repId}/morceaux`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    })
    setRemovingId(null)
    fetchData()
  }

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!rehearsal) return <div className="text-gray-500">Répétition introuvable.</div>

  const myUserId = Number(session?.user?.id)
  const myAttendance = rehearsal.attendances.find((a) => a.userId === myUserId)
  const isChef = groupInfo?.groupRole === 'CHEF'

  const setlistIds = new Set(rehearsal.songs.map((s) => s.song.id))
  const availableSongs = groupSongs.filter((s) => !setlistIds.has(s.id))

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/groupes" className="hover:text-indigo-600">Mes groupes</Link>
        <span>/</span>
        <Link href={`/groupes/${params.id}`} className="hover:text-indigo-600">{groupInfo?.name}</Link>
        <span>/</span>
        <Link href={`/groupes/${params.id}/repetitions`} className="hover:text-indigo-600">Répétitions</Link>
        <span>/</span>
        <span className="text-gray-900">Détail</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {formatDateWithDay(rehearsal.date)}
        </h1>
        <p className="text-gray-500 mt-1">
          {rehearsal.startTime}{rehearsal.endTime ? ` - ${rehearsal.endTime}` : ''} · {rehearsal.location}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Setlist — col large */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title={`Morceaux à préparer (${rehearsal.songs.length})`} />

            {rehearsal.songs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucun morceau au programme.</p>
            ) : (
              <div className="space-y-4">
                {rehearsal.songs.map(({ song }, index) => (
                  <div key={song.id} className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
                    {/* Song header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-sm font-semibold text-gray-400 w-5 flex-shrink-0">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{song.title}</p>
                        {song.artist && <p className="text-xs text-gray-500">{song.artist}</p>}
                      </div>
                      {isChef && (
                        <button
                          onClick={() => removeSong(song.id)}
                          disabled={removingId === song.id}
                          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 flex-shrink-0"
                          title="Retirer de la setlist"
                        >
                          ✕ Retirer
                        </button>
                      )}
                    </div>

                    {/* Resources toggle */}
                    {song.resources.length > 0 && (
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => toggleResources(song.id)}
                          className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          <span>{song.resources.length} fichier{song.resources.length > 1 ? 's' : ''}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedSongIds.has(song.id) ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {expandedSongIds.has(song.id) && (
                          <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                            {song.resources.map((res) => (
                              <div key={res.id}>
                                {res.type === 'AUDIO' ? (
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-base">{getResourceIcon(res.type)}</span>
                                      <span className="text-xs font-medium text-gray-700">{res.name}</span>
                                    </div>
                                    <audio controls src={res.filePath} className="w-full" style={{ height: '32px' }} />
                                  </div>
                                ) : (
                                  <a
                                    href={res.filePath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                                  >
                                    <span className="text-base">{getResourceIcon(res.type)}</span>
                                    <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 flex-1 truncate">
                                      {res.name}
                                    </span>
                                    <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Chef: add song to setlist */}
            {isChef && availableSongs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Ajouter un morceau au programme</p>
                <div className="flex flex-wrap gap-2">
                  {availableSongs.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => addSong(song.id)}
                      disabled={addingId === song.id}
                      className="flex items-center gap-1.5 rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                      <span>+</span>
                      <span>{song.title}{song.artist ? ` — ${song.artist}` : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isChef && availableSongs.length === 0 && groupSongs.length > 0 && (
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 text-center">
                Tous les morceaux du répertoire sont déjà au programme.
              </p>
            )}

            {isChef && groupSongs.length === 0 && (
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 text-center">
                <Link href={`/groupes/${params.id}/morceaux`} className="text-indigo-600 hover:underline">
                  Ajoutez des morceaux au répertoire
                </Link>{' '}
                pour les programmer ici.
              </p>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* My attendance */}
          <Card>
            <CardHeader title="Ma présence" />
            <p className="text-sm text-gray-600 mb-3">Indiquez votre disponibilité.</p>
            {myAttendance && <AttendanceBadge status={myAttendance.status} />}
            <div className="mt-3">
              <AttendanceButton
                rehearsalId={rehearsal.id}
                currentStatus={myAttendance?.status || 'INCERTAIN'}
                onUpdate={fetchData}
              />
            </div>
          </Card>

          {/* Notes */}
          {rehearsal.notes && (
            <Card>
              <CardHeader title="Notes" />
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{rehearsal.notes}</p>
            </Card>
          )}

          {/* Attendances */}
          <Card>
            <CardHeader title={`Présences (${rehearsal.attendances.length})`} />
            {rehearsal.attendances.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune réponse pour l&apos;instant.</p>
            ) : (
              <div className="space-y-2">
                {rehearsal.attendances.map((att) => (
                  <div
                    key={att.userId}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
                        {att.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{att.user.name}</span>
                    </div>
                    <AttendanceBadge status={att.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
