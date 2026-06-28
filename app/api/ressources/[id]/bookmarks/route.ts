import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SELECT = { id: true, page: true, xPct: true, yPct: true, label: true, kind: true, color: true, targetBookmarkId: true, createdAt: true }

async function canAccessResource(resourceId: number, userId: number, isAdmin: boolean) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, song: { select: { groupId: true } } },
  })
  if (!resource) return false
  if (isAdmin) return true
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: resource.song.groupId } },
    select: { userId: true },
  })
  return !!membership
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!(await canAccessResource(resourceId, userId, isAdmin))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const bookmarks = await prisma.pdfBookmark.findMany({
    where: { resourceId, userId },
    select: SELECT,
    orderBy: [{ page: 'asc' }, { yPct: 'asc' }, { xPct: 'asc' }],
  })
  return NextResponse.json({ bookmarks })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!(await canAccessResource(resourceId, userId, isAdmin))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const xPct = Number(body.xPct)
  const yPct = Number(body.yPct)
  if (![xPct, yPct].every((n) => Number.isFinite(n))) {
    return NextResponse.json({ error: 'Position invalide.' }, { status: 400 })
  }

  const bookmark = await prisma.pdfBookmark.create({
    data: {
      userId,
      resourceId,
      page: Number.isFinite(Number(body.page)) ? Math.max(1, Math.round(Number(body.page))) : 1,
      xPct: Math.max(0, Math.min(1, xPct)),
      yPct: Math.max(0, Math.min(1, yPct)),
      label: typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : (body.kind === 'NOTE' ? 'Note' : 'Repère'),
      kind: body.kind === 'NOTE' ? 'NOTE' : 'BOOKMARK',
      color: body.kind === 'NOTE' ? 'amber' : 'emerald',
    },
    select: SELECT,
  })
  return NextResponse.json(bookmark, { status: 201 })
}
