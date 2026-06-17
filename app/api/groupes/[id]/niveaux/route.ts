import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireChef(groupId: number) {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  const isChef = isAdmin || membership?.groupRole === 'CHEF'
  if (!isChef) return null
  return { userId }
}

// Normalise une liste d'ids d'élèves (membres de la classe uniquement).
async function cleanMemberIds(groupId: number, raw: unknown): Promise<number[]> {
  const ids = Array.isArray(raw) ? Array.from(new Set(raw.map(Number).filter(Number.isInteger))) : []
  if (ids.length === 0) return []
  const members = await prisma.groupMember.findMany({ where: { groupId, userId: { in: ids } }, select: { userId: true } })
  return members.map((m) => m.userId)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  if (!(await requireChef(groupId))) return NextResponse.json({ error: 'Réservé au professeur.' }, { status: 403 })
  const levels = await prisma.studentLevelGroup.findMany({ where: { groupId }, orderBy: { name: 'asc' } })
  return NextResponse.json({ levels: levels.map((l) => ({ id: l.id, name: l.name, memberIds: JSON.parse(l.memberIds || '[]') })) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  if (!(await requireChef(groupId))) return NextResponse.json({ error: 'Réservé au professeur.' }, { status: 403 })

  const { name, memberIds } = await req.json().catch(() => ({}))
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis.' }, { status: 400 })
  const ids = await cleanMemberIds(groupId, memberIds)

  const level = await prisma.studentLevelGroup.create({
    data: { groupId, name: name.trim(), memberIds: JSON.stringify(ids) },
  })
  return NextResponse.json({ ok: true, level: { id: level.id, name: level.name, memberIds: ids } }, { status: 201 })
}
