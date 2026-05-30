import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MSG_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  editedAt: true,
  userId: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
}

function checkMembership(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return Promise.resolve(true)
  return prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  }).then(m => !!m)
}

// GET /api/groupes/[id]/messages
// ?after=<id>   → messages plus récents (polling)
// ?before=<id>  → messages plus anciens (pagination)
// ?limit=50     → nombre de messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const userId  = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!await checkMembership(userId, groupId, isAdmin))
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const after  = req.nextUrl.searchParams.get('after')
  const before = req.nextUrl.searchParams.get('before')
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 100)

  const messages = await prisma.groupMessage.findMany({
    where: {
      groupId,
      ...(after  ? { id: { gt: Number(after) } }  : {}),
      ...(before ? { id: { lt: Number(before) } } : {}),
    },
    orderBy: { createdAt: after ? 'asc' : 'desc' },
    take: limit,
    select: MSG_SELECT,
  })

  // Si on charge depuis le début (pas de cursor), on retourne dans l'ordre chronologique
  const ordered = after ? messages : messages.reverse()
  return NextResponse.json(ordered)
}

// POST /api/groupes/[id]/messages
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const userId  = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!await checkMembership(userId, groupId, isAdmin))
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { content } = await req.json()
  const trimmed = content?.trim()
  if (!trimmed || trimmed.length === 0) return NextResponse.json({ error: 'Message vide.' }, { status: 400 })
  if (trimmed.length > 2000) return NextResponse.json({ error: 'Message trop long (max 2000 caractères).' }, { status: 400 })

  const message = await prisma.groupMessage.create({
    data: { groupId, userId, content: trimmed },
    select: MSG_SELECT,
  })

  return NextResponse.json(message, { status: 201 })
}
