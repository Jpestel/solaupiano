import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; unavId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const unavId = Number(params.unavId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const item = await prisma.unavailability.findUnique({ where: { id: unavId } })
  if (!item || item.groupId !== groupId) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  // Auteur, ou chef du groupe, ou admin
  const isOwner = item.userId === userId
  let isChef = isAdmin
  if (!isOwner && !isChef) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
    isChef = m?.groupRole === 'CHEF'
  }
  if (!isOwner && !isChef) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.unavailability.delete({ where: { id: unavId } })
  return NextResponse.json({ success: true })
}
