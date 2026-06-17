import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Récupère le contexte d'accès au groupe pour l'utilisateur courant.
async function context(groupId: number) {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && !membership) return null
  const isChef = isAdmin || membership?.groupRole === 'CHEF'
  return { userId, isAdmin, isChef }
}

// GET : liste des devoirs. Prof → tous ; élève → seulement les siens (privé).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const ctx = await context(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const assignments = await prisma.assignment.findMany({
    where: { groupId, ...(ctx.isChef ? {} : { studentId: ctx.userId }) },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    include: {
      student: { select: { id: true, name: true } },
      song: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json({ isChef: ctx.isChef, assignments })
}

// POST : un prof (chef) assigne un devoir à un élève du groupe.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const ctx = await context(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au professeur.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { title, instruction, songId, dueDate } = body
  // Accepte studentIds[] (multi) ou studentId (compat).
  const rawIds: unknown[] = Array.isArray(body.studentIds) ? body.studentIds : (body.studentId != null ? [body.studentId] : [])
  const ids = Array.from(new Set(rawIds.map(Number).filter(Number.isInteger)))

  if (ids.length === 0 || !title?.trim()) {
    return NextResponse.json({ error: 'Au moins un élève et un intitulé sont requis.' }, { status: 400 })
  }

  // On ne garde que les élèves réellement membres de la classe.
  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: ids } },
    select: { userId: true },
  })
  const validIds = members.map((m) => m.userId)
  if (validIds.length === 0) {
    return NextResponse.json({ error: 'Aucun élève valide dans la classe.' }, { status: 400 })
  }

  await prisma.assignment.createMany({
    data: validIds.map((sid) => ({
      groupId,
      studentId: sid,
      teacherId: ctx.userId,
      title: title.trim(),
      instruction: instruction?.trim() || null,
      songId: songId ? Number(songId) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    })),
  })

  return NextResponse.json({ ok: true, created: validIds.length }, { status: 201 })
}
