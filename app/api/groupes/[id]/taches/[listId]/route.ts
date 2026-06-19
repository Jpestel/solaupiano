import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { groupContext, groupHasModuleAccess } from '@/lib/group-access'

export const dynamic = 'force-dynamic'

// PATCH : le chef modifie le titre / la date d'une liste.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; listId: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!(await groupHasModuleAccess(ctx, groupId, 'feature_tasks'))) {
    return NextResponse.json({ error: 'MODULE_LOCKED' }, { status: 403 })
  }
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const list = await prisma.taskList.findFirst({ where: { id: Number(params.listId), groupId } })
  if (!list) return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (body.dueDate) {
    const d = new Date(body.dueDate)
    if (!isNaN(d.getTime())) data.dueDate = d
  }
  const updated = await prisma.taskList.update({ where: { id: list.id }, data })
  return NextResponse.json(updated)
}

// DELETE : le chef supprime une liste (et ses tâches en cascade).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; listId: string } }) {
  const groupId = Number(params.id)
  const ctx = await groupContext(groupId)
  if (!ctx) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (!(await groupHasModuleAccess(ctx, groupId, 'feature_tasks'))) {
    return NextResponse.json({ error: 'MODULE_LOCKED' }, { status: 403 })
  }
  if (!ctx.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const list = await prisma.taskList.findFirst({ where: { id: Number(params.listId), groupId } })
  if (!list) return NextResponse.json({ error: 'Liste introuvable.' }, { status: 404 })

  await prisma.taskList.delete({ where: { id: list.id } })
  return NextResponse.json({ success: true })
}
