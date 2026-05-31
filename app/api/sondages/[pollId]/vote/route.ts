import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const STATUSES = ['PRESENT', 'ABSENT', 'INCERTAIN']

// Enregistre/maj le vote du membre courant pour une option du sondage.
export async function POST(req: NextRequest, { params }: { params: { pollId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const pollId = Number(params.pollId)

  const { optionId, status } = await req.json()
  if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })

  const option = await prisma.pollOption.findUnique({
    where: { id: Number(optionId) },
    include: { poll: { select: { id: true, groupId: true, closed: true } } },
  })
  if (!option || option.poll.id !== pollId) return NextResponse.json({ error: 'Option introuvable.' }, { status: 404 })
  if (option.poll.closed) return NextResponse.json({ error: 'Ce sondage est clôturé.' }, { status: 403 })

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: option.poll.groupId } } })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.pollVote.upsert({
    where: { optionId_userId: { optionId: option.id, userId } },
    create: { optionId: option.id, userId, status },
    update: { status },
  })

  return NextResponse.json({ ok: true })
}
