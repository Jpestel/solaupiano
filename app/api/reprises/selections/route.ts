import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reprisesUser } from '@/lib/reprises'
import { newShareToken } from '@/lib/reprises-partage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const rows = await prisma.coverShare.findMany({
    where: { userId: u.userId }, orderBy: { createdAt: 'desc' },
    select: { id: true, token: true, name: true, createdAt: true, _count: { select: { scores: true } } },
  })
  return NextResponse.json(rows)
}

/** Body : { name?: string, scoreIds: number[] } */
export async function POST(req: NextRequest) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const ids: number[] = Array.isArray(b.scoreIds) ? b.scoreIds.map(Number).filter(Number.isFinite) : []
  // Uniquement ses propres partitions.
  const own = await prisma.coverScore.findMany({ where: { userId: u.userId, id: { in: ids } }, select: { id: true } })
  if (own.length === 0) return NextResponse.json({ error: 'Choisissez au moins une partition.' }, { status: 400 })
  const name = typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 100) : null
  const row = await prisma.coverShare.create({
    data: { userId: u.userId, token: newShareToken(), name, scores: { connect: own } },
    select: { id: true, token: true, name: true, createdAt: true, _count: { select: { scores: true } } },
  })
  return NextResponse.json(row, { status: 201 })
}
