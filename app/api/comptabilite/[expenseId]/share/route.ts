import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Marque la part d'un membre comme payée / non payée (chef du groupe)
export async function POST(req: NextRequest, { params }: { params: { expenseId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const expenseId = Number(params.expenseId)
  const expense = await prisma.groupExpense.findUnique({ where: { id: expenseId }, select: { groupId: true } })
  if (!expense) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!isAdmin) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: Number(session.user.id), groupId: expense.groupId } } })
    if (m?.groupRole !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })
  }

  const { userId, paid } = await req.json()
  const share = await prisma.expenseShare.findUnique({ where: { expenseId_userId: { expenseId, userId: Number(userId) } } })
  if (!share) return NextResponse.json({ error: 'Part introuvable.' }, { status: 404 })

  await prisma.expenseShare.update({
    where: { id: share.id },
    data: { paid: !!paid, paidAt: paid ? new Date() : null },
  })
  return NextResponse.json({ ok: true })
}
