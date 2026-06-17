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
  return (isAdmin || membership?.groupRole === 'CHEF') ? { userId } : null
}

async function cleanMemberIds(groupId: number, raw: unknown): Promise<number[]> {
  const ids = Array.isArray(raw) ? Array.from(new Set(raw.map(Number).filter(Number.isInteger))) : []
  if (ids.length === 0) return []
  const members = await prisma.groupMember.findMany({ where: { groupId, userId: { in: ids } }, select: { userId: true } })
  return members.map((m) => m.userId)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; levelId: string } }) {
  const groupId = Number(params.id)
  if (!(await requireChef(groupId))) return NextResponse.json({ error: 'Réservé au professeur.' }, { status: 403 })

  const level = await prisma.studentLevelGroup.findFirst({ where: { id: Number(params.levelId), groupId } })
  if (!level) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if ('memberIds' in body) data.memberIds = JSON.stringify(await cleanMemberIds(groupId, body.memberIds))
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })

  const updated = await prisma.studentLevelGroup.update({ where: { id: level.id }, data })
  return NextResponse.json({ ok: true, level: { id: updated.id, name: updated.name, memberIds: JSON.parse(updated.memberIds || '[]') } })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; levelId: string } }) {
  const groupId = Number(params.id)
  if (!(await requireChef(groupId))) return NextResponse.json({ error: 'Réservé au professeur.' }, { status: 403 })
  await prisma.studentLevelGroup.deleteMany({ where: { id: Number(params.levelId), groupId } })
  return NextResponse.json({ ok: true })
}
