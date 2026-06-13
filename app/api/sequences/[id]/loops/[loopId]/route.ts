import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH — modifie une boucle existante (uniquement la sienne) { label?, startSec, endSec, speed? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string; loopId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const loopId = Number(params.loopId)

  const loop = await prisma.sequenceLoop.findUnique({ where: { id: loopId }, select: { userId: true, sequenceId: true } })
  if (!loop) return NextResponse.json({ error: 'Boucle introuvable.' }, { status: 404 })
  if (loop.userId !== userId && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Vous ne pouvez modifier que vos propres boucles.' }, { status: 403 })
  }
  if (loop.sequenceId !== Number(params.id)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const b = await req.json().catch(() => ({}))
  const startSec = Number(b.startSec)
  const endSec = Number(b.endSec)
  if (!isFinite(startSec) || !isFinite(endSec) || endSec <= startSec) {
    return NextResponse.json({ error: 'Intervalle invalide.' }, { status: 400 })
  }
  const speed = isFinite(Number(b.speed)) ? Math.max(0.25, Math.min(2, Number(b.speed))) : 1
  const label = typeof b.label === 'string' ? (b.label.trim().slice(0, 60) || null) : undefined

  const updated = await prisma.sequenceLoop.update({
    where: { id: loopId },
    data: { startSec, endSec, speed, ...(label !== undefined ? { label } : {}) },
    select: { id: true, label: true, startSec: true, endSec: true, speed: true },
  })
  return NextResponse.json(updated)
}

// DELETE — supprime une boucle (uniquement la sienne)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; loopId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const loopId = Number(params.loopId)

  const loop = await prisma.sequenceLoop.findUnique({ where: { id: loopId }, select: { userId: true, sequenceId: true } })
  if (!loop) return NextResponse.json({ error: 'Boucle introuvable.' }, { status: 404 })
  if (loop.userId !== userId && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Vous ne pouvez supprimer que vos propres boucles.' }, { status: 403 })
  }
  if (loop.sequenceId !== Number(params.id)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  await prisma.sequenceLoop.delete({ where: { id: loopId } })
  return NextResponse.json({ ok: true })
}
