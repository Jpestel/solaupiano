import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SELECT = { id: true, page: true, xPct: true, yPct: true, startSec: true, label: true, sequenceId: true }

async function ownMarker(markerId: number, resourceId: number, userId: number, isAdmin: boolean) {
  const m = await prisma.scoreMarker.findUnique({ where: { id: markerId }, select: { userId: true, resourceId: true } })
  if (!m || m.resourceId !== resourceId) return null
  if (m.userId !== userId && !isAdmin) return null
  return m
}

// PATCH — modifie un marqueur (le sien) : startSec, label, xPct, yPct, page, sequenceId
export async function PATCH(req: NextRequest, { params }: { params: { id: string; markerId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const markerId = Number(params.markerId)
  if (!(await ownMarker(markerId, resourceId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const b = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (isFinite(Number(b.startSec))) data.startSec = Math.max(0, Number(b.startSec))
  if (isFinite(Number(b.xPct))) data.xPct = Math.max(0, Math.min(1, Number(b.xPct)))
  if (isFinite(Number(b.yPct))) data.yPct = Math.max(0, Math.min(1, Number(b.yPct)))
  if (isFinite(Number(b.page))) data.page = Math.max(1, Math.round(Number(b.page)))
  if (isFinite(Number(b.sequenceId))) data.sequenceId = Number(b.sequenceId)
  if (typeof b.label === 'string') data.label = b.label.trim().slice(0, 80) || null

  const updated = await prisma.scoreMarker.update({ where: { id: markerId }, data, select: SELECT })
  return NextResponse.json(updated)
}

// DELETE — supprime un marqueur (le sien)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; markerId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const markerId = Number(params.markerId)
  if (!(await ownMarker(markerId, resourceId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  await prisma.scoreMarker.delete({ where: { id: markerId } })
  return NextResponse.json({ ok: true })
}
