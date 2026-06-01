import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { verifyPresence } from '@/lib/presence-token'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PresencePage({ searchParams }: { searchParams: { r?: string; u?: string; t?: string; a?: string } }) {
  const rehearsalId = Number(searchParams.r)
  const userId = Number(searchParams.u)
  const token = searchParams.t || ''
  const action = searchParams.a === 'present' ? 'PRESENT' : 'ABSENT'

  const valid = rehearsalId && userId && verifyPresence(rehearsalId, userId, token)

  let rehearsal: { date: Date; location: string; startTime: string; endTime: string | null; group: { name: string } } | null = null
  let done = false
  if (valid) {
    rehearsal = await prisma.rehearsal.findUnique({
      where: { id: rehearsalId },
      select: { date: true, location: true, startTime: true, endTime: true, group: { select: { name: true } } },
    })
    if (rehearsal) {
      await prisma.attendance.upsert({
        where: { userId_rehearsalId: { userId, rehearsalId } },
        create: { userId, rehearsalId, status: action },
        update: { status: action },
      })
      done = true
    }
  }

  const otherAction = action === 'ABSENT' ? 'present' : 'absent'
  const otherToken = token // même token, action différente
  const otherUrl = `/presence?r=${rehearsalId}&u=${userId}&t=${otherToken}&a=${otherAction}`

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
              Répétition <strong>{rehearsal!.group.name}</strong><br />
              <span className="capitalize">{fmtDate(rehearsal!.date)}</span> · {rehearsal!.startTime}{rehearsal!.endTime ? `–${rehearsal!.endTime}` : ''} · {rehearsal!.location}
            </p>
            {action === 'ABSENT' ? (
              <p className="text-sm text-gray-500 mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                Vous n&apos;avez donc <strong>pas besoin de laisser d&apos;évaluation</strong> pour cette répétition.
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
