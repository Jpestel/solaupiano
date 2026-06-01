import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { verifyPresence, verifyConcertPresence } from '@/lib/presence-token'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PresencePage({ searchParams }: { searchParams: { r?: string; c?: string; u?: string; t?: string; a?: string } }) {
  const isConcert = !!searchParams.c
  const eventId = Number(isConcert ? searchParams.c : searchParams.r)
  const userId = Number(searchParams.u)
  const token = searchParams.t || ''
  const action = searchParams.a === 'present' ? 'PRESENT' : 'ABSENT'

  const valid = eventId && userId && (isConcert ? verifyConcertPresence(eventId, userId, token) : verifyPresence(eventId, userId, token))

  let rehearsal: { date: Date; location: string; startTime: string; endTime: string | null; group: { name: string } } | null = null
  let done = false
  if (valid) {
    if (isConcert) {
      const concert = await prisma.concert.findUnique({
        where: { id: eventId },
        select: { date: true, location: true, name: true, group: { select: { name: true } } },
      })
      if (concert) {
        rehearsal = { date: concert.date, location: concert.location, startTime: concert.name, endTime: null, group: concert.group }
        await prisma.concertAttendance.upsert({
          where: { userId_concertId: { userId, concertId: eventId } },
          create: { userId, concertId: eventId, status: action },
          update: { status: action },
        })
        if (action === 'ABSENT') {
          await prisma.concertEvaluation.deleteMany({ where: { concertId: eventId, evaluatorId: userId } })
        }
        done = true
      }
    } else {
      rehearsal = await prisma.rehearsal.findUnique({
        where: { id: eventId },
        select: { date: true, location: true, startTime: true, endTime: true, group: { select: { name: true } } },
      })
      if (rehearsal) {
        await prisma.attendance.upsert({
          where: { userId_rehearsalId: { userId, rehearsalId: eventId } },
          create: { userId, rehearsalId: eventId, status: action },
          update: { status: action },
        })
        if (action === 'ABSENT') {
          await prisma.rehearsalEvaluation.deleteMany({ where: { rehearsalId: eventId, evaluatorId: userId } })
        }
        done = true
      }
    }
  }

  const otherAction = action === 'ABSENT' ? 'present' : 'absent'
  const key = isConcert ? 'c' : 'r'
  const otherUrl = `/presence?${key}=${eventId}&u=${userId}&t=${token}&a=${otherAction}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        {!valid || !done ? (
          <>
            <p className="text-4xl mb-3">🔗</p>
            <h1 className="text-lg font-bold text-gray-900">Lien invalide ou expiré</h1>
            <p className="text-sm text-gray-500 mt-2">Ce lien de présence n&apos;est plus valide. Vous pouvez gérer votre présence directement dans l&apos;application.</p>
            <Link href="/connexion" className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Ouvrir Sol au piano</Link>
          </>
        ) : (
          <>
            <p className="text-4xl mb-3">{action === 'ABSENT' ? '🚫' : '✅'}</p>
            <h1 className="text-lg font-bold text-gray-900">
              Présence mise à jour : <span className={action === 'ABSENT' ? 'text-red-600' : 'text-green-600'}>{action === 'ABSENT' ? 'Absent(e)' : 'Présent(e)'}</span>
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {isConcert ? 'Concert' : 'Répétition'} <strong>{isConcert ? rehearsal!.startTime : rehearsal!.group.name}</strong><br />
              <span className="capitalize">{fmtDate(rehearsal!.date)}</span>
              {isConcert ? '' : ` · ${rehearsal!.startTime}${rehearsal!.endTime ? `–${rehearsal!.endTime}` : ''}`} · {rehearsal!.location}
            </p>
            {action === 'ABSENT' ? (
              <p className="text-sm text-gray-500 mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                Vous n&apos;avez donc <strong>pas besoin de laisser d&apos;évaluation</strong> pour {isConcert ? 'ce concert' : 'cette répétition'}.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-3">Merci ! Vous pouvez laisser votre évaluation dans l&apos;application.</p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <Link href="/connexion" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Ouvrir Sol au piano</Link>
              <a href={otherUrl} className="text-xs text-gray-400 hover:text-gray-600">
                {action === 'ABSENT' ? 'Erreur ? J\'étais finalement présent(e)' : 'Me marquer absent(e) à la place'}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
