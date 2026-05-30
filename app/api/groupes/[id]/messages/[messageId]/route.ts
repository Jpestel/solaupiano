import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH — modifier son propre message
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId    = Number(session.user.id)
  const messageId = Number(params.messageId)

  const msg = await prisma.groupMessage.findUnique({ where: { id: messageId } })
  if (!msg) return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })
  if (msg.userId !== userId) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { content } = await req.json()
  const trimmed = content?.trim()
  if (!trimmed || trimmed.length === 0) return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
  if (trimmed.length > 2000) return NextResponse.json({ error: 'Trop long.' }, { status: 400 })

  const updated = await prisma.groupMessage.update({
    where: { id: messageId },
    data: { content: trimmed, editedAt: new Date() },
    select: {
      id: true, content: true, createdAt: true, editedAt: true, userId: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  return NextResponse.json(updated)
}

// DELETE — supprimer son propre message OU le chef peut supprimer n'importe quel message
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId    = Number(session.user.id)
  const groupId   = Number(params.id)
  const messageId = Number(params.messageId)
  const isAdmin   = session.user.siteRole === 'ADMIN'

  const msg = await prisma.groupMessage.findUnique({ where: { id: messageId } })
  if (!msg) return NextResponse.json({ error: 'Message introuvable.' }, { status: 404 })

  // Autorisé si : auteur du message OU chef du groupe OU admin site
  const isAuthor = msg.userId === userId
  if (!isAuthor && !isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (!membership || membership.groupRole !== 'CHEF')
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  await prisma.groupMessage.delete({ where: { id: messageId } })
  return NextResponse.json({ ok: true })
}
