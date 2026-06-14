import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ALLOWED_COLORS = ['indigo', 'amber', 'green', 'sky', 'rose', 'purple']
const ALLOWED_AUDIENCES = ['ALL', 'MEMBERS', 'CHEFS', 'ADMINS']

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const id = Number(params.id)
  const b = await req.json().catch(() => ({}))

  const data: Record<string, unknown> = {}
  if (typeof b.xPct === 'number') data.xPct = Math.max(0, Math.min(100, b.xPct))
  if (typeof b.yPx === 'number') data.yPx = Math.max(0, Math.round(b.yPx))
  if (b.anchorSelector !== undefined) data.anchorSelector = (typeof b.anchorSelector === 'string' && b.anchorSelector) ? b.anchorSelector.slice(0, 1000) : null
  if (b.anchorDx !== undefined) data.anchorDx = typeof b.anchorDx === 'number' && isFinite(b.anchorDx) ? b.anchorDx : null
  if (b.anchorDy !== undefined) data.anchorDy = typeof b.anchorDy === 'number' && isFinite(b.anchorDy) ? b.anchorDy : null
  if (typeof b.title === 'string') data.title = b.title.slice(0, 120)
  if (typeof b.content === 'string') data.content = b.content.slice(0, 2000)
  if (typeof b.emoji === 'string') data.emoji = b.emoji.slice(0, 8)
  if (typeof b.color === 'string' && ALLOWED_COLORS.includes(b.color)) data.color = b.color
  if (typeof b.audience === 'string' && ALLOWED_AUDIENCES.includes(b.audience)) data.audience = b.audience
  if (typeof b.active === 'boolean') data.active = b.active
  if (typeof b.path === 'string' && b.path.trim()) data.path = b.path.trim()

  const updated = await prisma.helpBubble.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  await prisma.helpBubble.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
