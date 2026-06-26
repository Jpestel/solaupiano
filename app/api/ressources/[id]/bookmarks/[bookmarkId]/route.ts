import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SELECT = { id: true, page: true, xPct: true, yPct: true, label: true, targetBookmarkId: true, createdAt: true }

async function ownBookmark(bookmarkId: number, resourceId: number, userId: number, isAdmin: boolean) {
  const bookmark = await prisma.pdfBookmark.findUnique({
    where: { id: bookmarkId },
    select: { id: true, userId: true, resourceId: true },
  })
  if (!bookmark || bookmark.resourceId !== resourceId) return null
  if (bookmark.userId !== userId && !isAdmin) return null
  return bookmark
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; bookmarkId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const bookmarkId = Number(params.bookmarkId)
  const bookmark = await ownBookmark(bookmarkId, resourceId, userId, session.user.siteRole === 'ADMIN')
  if (!bookmark) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (Number.isFinite(Number(body.page))) data.page = Math.max(1, Math.round(Number(body.page)))
  if (Number.isFinite(Number(body.xPct))) data.xPct = Math.max(0, Math.min(1, Number(body.xPct)))
  if (Number.isFinite(Number(body.yPct))) data.yPct = Math.max(0, Math.min(1, Number(body.yPct)))
  if (typeof body.label === 'string') data.label = body.label.trim().slice(0, 80) || 'Repère'
  if (body.targetBookmarkId === null) {
    data.targetBookmarkId = null
  } else if (Number.isFinite(Number(body.targetBookmarkId))) {
    const targetBookmarkId = Number(body.targetBookmarkId)
    if (targetBookmarkId === bookmarkId) {
      return NextResponse.json({ error: 'Un repère ne peut pas pointer vers lui-même.' }, { status: 400 })
    }
    const target = await prisma.pdfBookmark.findUnique({
      where: { id: targetBookmarkId },
      select: { id: true, userId: true, resourceId: true },
    })
    if (!target || target.resourceId !== resourceId || (target.userId !== userId && session.user.siteRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Repère de destination invalide.' }, { status: 400 })
    }
    data.targetBookmarkId = targetBookmarkId
  }

  const updated = await prisma.pdfBookmark.update({ where: { id: bookmarkId }, data, select: SELECT })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; bookmarkId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const bookmarkId = Number(params.bookmarkId)
  const bookmark = await ownBookmark(bookmarkId, resourceId, userId, session.user.siteRole === 'ADMIN')
  if (!bookmark) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  await prisma.pdfBookmark.updateMany({
    where: { resourceId, userId: bookmark.userId, targetBookmarkId: bookmarkId },
    data: { targetBookmarkId: null },
  })
  await prisma.pdfBookmark.delete({ where: { id: bookmarkId } })
  return NextResponse.json({ ok: true })
}
