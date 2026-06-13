import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function ctx(resourceId: number, userId: number, isAdmin: boolean) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, song: { select: { id: true, groupId: true } } },
  })
  if (!resource) return null
  if (!isAdmin) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: resource.song.groupId } } })
    if (!m) return null
  }
  return resource
}

const SELECT = { id: true, page: true, xPct: true, yPct: true, startSec: true, label: true, sequenceId: true }

// GET — marqueurs de l'utilisateur sur cette ressource + séquences audio du morceau
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const c = await ctx(resourceId, userId, session.user.siteRole === 'ADMIN')
  if (!c) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [markers, sequences] = await Promise.all([
    prisma.scoreMarker.findMany({ where: { resourceId, userId }, select: SELECT, orderBy: { startSec: 'asc' } }),
    prisma.songSequence.findMany({ where: { songId: c.song.id, kind: 'AUDIO' }, select: { id: true, title: true, filePath: true }, orderBy: { createdAt: 'desc' } }),
  ])
  return NextResponse.json({ markers, sequences })
}

// POST — crée un marqueur { sequenceId, page, xPct, yPct, startSec, label? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const c = await ctx(resourceId, userId, session.user.siteRole === 'ADMIN')
  if (!c) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  const sequenceId = Number(b.sequenceId)
  const xPct = Number(b.xPct), yPct = Number(b.yPct), startSec = Number(b.startSec)
  if (!sequenceId || ![xPct, yPct, startSec].every((n) => isFinite(n))) {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  // La séquence doit appartenir au même morceau
  const seq = await prisma.songSequence.findFirst({ where: { id: sequenceId, songId: c.song.id }, select: { id: true } })
  if (!seq) return NextResponse.json({ error: 'Séquence invalide.' }, { status: 400 })

  const marker = await prisma.scoreMarker.create({
    data: {
      userId, resourceId, sequenceId,
      page: Number.isFinite(Number(b.page)) ? Math.max(1, Math.round(Number(b.page))) : 1,
      xPct: Math.max(0, Math.min(1, xPct)),
      yPct: Math.max(0, Math.min(1, yPct)),
      startSec: Math.max(0, startSec),
      label: typeof b.label === 'string' && b.label.trim() ? b.label.trim().slice(0, 80) : null,
    },
    select: SELECT,
  })
  return NextResponse.json(marker, { status: 201 })
}
