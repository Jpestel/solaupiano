'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDateWithDay } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { AttendanceBadge } from '@/components/ui/Badge'
import { AttendanceButton } from '@/components/AttendanceButton'

interface Song {
  id: number
  title: string
  artist?: string
}

interface Attendance {
  userId: number
  status: 'PRESENT' | 'ABSENT' | 'INCERTAIN'
  user: {
    id: number
    name: string
  }
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

export default function RepetitionDetailPage({
  params,
}: {
  params: { id: string; repId: string }
}) {
  const { data: session } = useSession()
  const [rehearsal, setRehearsals] = useState<Rehearsal | null>(null)
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const [repRes, grpRes] = await Promise.all([
      fetch(`/api/repetitions/${params.repId}`),
      fetch(`/api/groupes/${params.id}`),
    ])
    if (repRes.ok) setRehearsals(await repRes.json())
    if (grpRes.ok) {
      const g = await grpRes.json()
      const me = g.members?.find((m: { userId: number; groupRole: string }) => m.userId === Number(session?.user?.id))
      setGroupInfo({ name: g.name, groupRole: me?.groupRole || 'MEMBRE' })
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchData()
  }, [session, params.repId])

  if (loading) return <div className="text-gray-500">Chargement...</div>
  if (!rehearsal) return <div className="text-gray-500">Répétition introuvable.</div>

  const myUserId = Number(session?.user?.id)
  const myAttendance = rehearsal.attendances.find((a) => a.userId === myUserId)
  const isChef = groupInfo?.groupRole === 'CHEF'

  return (
    <div>
      {/* Breadcrumb */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My attendance */}
        <Card>
          <CardHeader title="Ma présence" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Indiquez votre disponibilité pour cette répétition.</p>
              {myAttendance && <AttendanceBadge status={myAttendance.status} />}
            </div>
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

        {/* Setlist */}
        <Card>
          <CardHeader
            title={`Morceaux à préparer (${rehearsal.songs.length})`}
          />
          {rehearsal.songs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucun morceau au programme.</p>
          ) : (
            <div className="space-y-2">
              {rehearsal.songs.map(({ song }, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <span className="text-sm font-semibold text-gray-400 w-5">{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{song.title}</p>
                    {song.artist && <p className="text-xs text-gray-500">{song.artist}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Attendances */}
        <Card>
          <CardHeader title={`Présences (${rehearsal.attendances.length})`} />
          {rehearsal.attendances.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune réponse pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-2">
              {rehearsal.attendances.map((att) => (
                <div
                  key={att.userId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
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
  )
}
