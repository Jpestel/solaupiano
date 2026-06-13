import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Vérifie que l'utilisateur a accès à la séquence (membre du groupe ou admin).
async function access(sequenceId: number, userId: number, isAdmin: boolean) {
  const seq = await prisma.songSequence.findUnique({
    where: { id: sequenceId },
    select: { id: true, song: { select: { groupId: true } } },
  })
  if (!seq) return null
  if (isAdmin) return seq
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: seq.song.groupId } } })
  return m ? seq : null
}

// GET — boucles sauvegardées de l'utilisateur courant pour cette séquence
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const sequenceId = Number(params.id)
  if (!(await access(sequenceId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const loops = await prisma.sequenceLoop.findMany({
    where: { sequenceId, userId },
    orderBy: { startSec: 'asc' },
    select: { id: true, label: true, startSec: true, endSec: true, speed: true },
  })
  return NextResponse.json(loops)
}

// POST — enregistre une boucle A–B { label?, startSec, endSec, speed? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const sequenceId = Number(params.id)
  if (!(await access(sequenceId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))
  const startSec = Number(b.startSec)
  const endSec = Number(b.endSec)
  if (!isFinite(startSec) || !isFinite(endSec) || endSec <= startSec) {
    return NextResponse.json({ error: 'Intervalle invalide.' }, { status: 400 })
  }
  const speed = isFinite(Number(b.speed)) ? Math.max(0.25, Math.min(2, Number(b.speed))) : 1
  const label = typeof b.label === 'string' && b.label.trim() ? b.label.trim().slice(0, 60) : null

  const loop = await prisma.sequenceLoop.create({
    data: { sequenceId, userId, label, startSec, endSec, speed },
    select: { id: true, label: true, startSec: true, endSec: true, speed: true },
  })
  return NextResponse.json(loop, { status: 201 })
}
