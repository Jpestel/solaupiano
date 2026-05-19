import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const { order } = await req.json()

  if (!Array.isArray(order)) return NextResponse.json({ error: 'Format invalide.' }, { status: 400 })

  await prisma.groupMember.update({
    where: { userId_groupId: { userId, groupId } },
    data: { cardOrder: JSON.stringify(order) },
  })

  return NextResponse.json({ ok: true })
}
