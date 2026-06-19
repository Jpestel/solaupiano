import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext } from '@/lib/group-access'

export const dynamic = 'force-dynamic'

// POST : le chef ajoute une tâche à une liste, assignée à 0..n membres.
export async function POST(req: NextRequest, { params }: { params: { id: string; listId: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const list = await prisma.taskList.findFirst({ where: { id: Number(params.listId), groupId } })
  if (!list) return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (!body.label?.trim()) return NextResponse.json({ error: 'Un intitulé est requis.' }, { status: 400 })

  const rawIds: unknown[] = Array.isArray(body.assigneeIds) ? body.assigneeIds : []
  const ids = Array.from(new Set(rawIds.map(Number).filter(Number.isInteger)))
  // On ne garde que les membres réels du groupe.
  const validIds = ids.length
    ? (await prisma.groupMember.findMany({ where: { groupId, userId: { in: ids } }, select: { userId: true } })).map((m) => m.userId)
    : []

  const task = await prisma.task.create({
    data: {
      taskListId: list.id,
      label: body.label.trim(),
      details: typeof body.details === 'string' && body.details.trim() ? body.details.trim() : null,
      assignees: validIds.length ? { create: validIds.map((userId) => ({ userId })) } : undefined,
    },
    include: { assignees: { select: { userId: true } } },
  })
  return NextResponse.json(task, { status: 201 })
}
