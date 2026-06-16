import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const STATUSES = ['A_FAIRE', 'EN_COURS', 'FAIT'] as const
type Status = (typeof STATUSES)[number]

async function load(groupId: number, devoirId: number) {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && !membership) return null
  const isChef = isAdmin || membership?.groupRole === 'CHEF'
  const assignment = await prisma.assignment.findFirst({ where: { id: devoirId, groupId } })
  if (!assignment) return null
  return { userId, isChef, assignment }
}

// PATCH : l'élève change le statut de SON devoir ; le prof édite tout.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; devoirId: string } }) {
  const ctx = await load(Number(params.id), Number(params.devoirId))
  if (!ctx) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const isOwnerStudent = ctx.assignment.studentId === ctx.userId

  if (!ctx.isChef && !isOwnerStudent) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.status === 'string' && STATUSES.includes(body.status as Status)) {
    data.status = body.status
  }
  // Champs réservés au professeur
  if (ctx.isChef) {
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
    if ('instruction' in body) data.instruction = body.instruction?.trim() || null
    if ('songId' in body) data.songId = body.songId ? Number(body.songId) : null
    if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })
  }

  const updated = await prisma.assignment.update({ where: { id: ctx.assignment.id }, data })
  return NextResponse.json({ ok: true, assignment: updated })
}

// DELETE : réservé au professeur.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; devoirId: string } }) {
  const ctx = await load(Number(params.id), Number(params.devoirId))
  if (!ctx) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au professeur.' }, { status: 403 })

  await prisma.assignment.delete({ where: { id: ctx.assignment.id } })
  return NextResponse.json({ ok: true })
}
