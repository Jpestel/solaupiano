import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

async function isChef(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return true
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  return m?.groupRole === 'CHEF'
}

// POST → generate share token
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  if (!await isChef(userId, groupId, session.user.siteRole === 'ADMIN')) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const token = randomBytes(24).toString('hex')

  const rider = await prisma.techRider.upsert({
    where: { groupId },
    update: { shareToken: token },
    create: { groupId, content: {}, shareToken: token },
  })

  return NextResponse.json({ shareToken: rider.shareToken })
}

// DELETE → revoke share token
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  if (!await isChef(userId, groupId, session.user.siteRole === 'ADMIN')) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  await prisma.techRider.updateMany({ where: { groupId }, data: { shareToken: null } })
  return NextResponse.json({ ok: true })
}
