import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireChef(session: any, groupId: number) {
  if (session.user.siteRole === 'ADMIN') return true
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: Number(session.user.id), groupId } } })
  return m?.groupRole === 'CHEF'
}

export async function PATCH(req: NextRequest, { params }: { params: { expenseId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const id = Number(params.expenseId)
  const expense = await prisma.groupExpense.findUnique({ where: { id }, select: { groupId: true } })
  if (!expense) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  if (!await requireChef(session, expense.groupId)) return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })

  const { title, description, period, category } = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof title === 'string' && title.trim()) data.title = title.trim().slice(0, 191)
  if (description !== undefined) data.description = description?.trim() || null
  if (period !== undefined) data.period = period?.trim()?.slice(0, 80) || null
  if (category !== undefined) data.category = category?.trim()?.slice(0, 60) || null

  const updated = await prisma.groupExpense.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { expenseId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const id = Number(params.expenseId)
  const expense = await prisma.groupExpense.findUnique({ where: { id }, select: { groupId: true } })
  if (!expense) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  if (!await requireChef(session, expense.groupId)) return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })

  await prisma.groupExpense.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
