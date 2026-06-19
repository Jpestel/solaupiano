import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext } from '@/lib/group-access'

export const dynamic = 'force-dynamic'

async function loadTask(groupId: number, listId: number, taskId: number) {
  return prisma.task.findFirst({
    where: { id: taskId, taskListId: listId, list: { groupId } },
    include: { assignees: { select: { userId: true } } },
  })
}

// PATCH : modifier une tâche (chef : label/détails/assignés) OU cocher/décocher
// « fait » (chef, ou un membre assigné à cette tâche).
export async function PATCH(req: NextRequest, { params }: { params: { id: string; listId: string; taskId: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const task = await loadTask(groupId, Number(params.listId), Number(params.taskId))
  if (!task) return NextResponse.json({ error: 'Tâche introuvable.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  // Cocher « fait » : autorisé au chef ou à un membre assigné.
  if (typeof body.done === 'boolean') {
    const isAssignee = task.assignees.some((a) => a.userId === ctx.userId)
    if (!ctx.isChef && !isAssignee) return NextResponse.json({ error: 'Non assigné à cette tâche.' }, { status: 403 })
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { done: body.done, doneAt: body.done ? new Date() : null, doneBy: body.done ? ctx.userId : null },
      include: { assignees: { select: { userId: true } } },
    })
    return NextResponse.json(updated)
  }

  // Édition du contenu / des assignés : réservé au chef.
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const data: Record<string, unknown> = {}
  if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim()
  if (body.details !== undefined) data.details = typeof body.details === 'string' && body.details.trim() ? body.details.trim() : null

  if (Array.isArray(body.assigneeIds)) {
    const ids = Array.from(new Set(body.assigneeIds.map(Number).filter(Number.isInteger)))
    const validIds = ids.length
      ? (await prisma.groupMember.findMany({ where: { groupId, userId: { in: ids } }, select: { userId: true } })).map((m) => m.userId)
      : []
    await prisma.taskAssignee.deleteMany({ where: { taskId: task.id } })
    if (validIds.length) {
      await prisma.taskAssignee.createMany({ data: validIds.map((userId) => ({ taskId: task.id, userId })) })
    }
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data,
    include: { assignees: { select: { userId: true } } },
  })
  return NextResponse.json(updated)
}

// DELETE : le chef supprime une tâche.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; listId: string; taskId: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const task = await loadTask(groupId, Number(params.listId), Number(params.taskId))
  if (!task) return NextResponse.json({ error: 'Tâche introuvable.' }, { status: 404 })

  await prisma.task.delete({ where: { id: task.id } })
  return NextResponse.json({ success: true })
}
