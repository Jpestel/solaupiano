import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SELECT = { id: true, page: true, xPct: true, yPct: true, label: true, createdAt: true }

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
  if (!(await ownBookmark(bookmarkId, resourceId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (Number.isFinite(Number(body.page))) data.page = Math.max(1, Math.round(Number(body.page)))
  if (Number.isFinite(Number(body.xPct))) data.xPct = Math.max(0, Math.min(1, Number(body.xPct)))
  if (Number.isFinite(Number(body.yPct))) data.yPct = Math.max(0, Math.min(1, Number(body.yPct)))
  if (typeof body.label === 'string') data.label = body.label.trim().slice(0, 80) || 'Repère'

  const updated = await prisma.pdfBookmark.update({ where: { id: bookmarkId }, data, select: SELECT })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; bookmarkId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const bookmarkId = Number(params.bookmarkId)
  if (!(await ownBookmark(bookmarkId, resourceId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  await prisma.pdfBookmark.delete({ where: { id: bookmarkId } })
  return NextResponse.json({ ok: true })
}
