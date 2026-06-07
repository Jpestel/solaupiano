import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json()
  const data: Record<string, unknown> = {}
  if (b.label !== undefined) data.label = String(b.label).trim()
  if (b.icon !== undefined) data.icon = b.icon?.trim() || '🔗'
  if (b.category !== undefined) data.category = b.category
  if (b.urlTemplate !== undefined) data.urlTemplate = String(b.urlTemplate).trim()
  if (b.description !== undefined) data.description = b.description?.trim() || null
  if (b.defaultActive !== undefined) data.defaultActive = !!b.defaultActive
  if (b.enabled !== undefined) data.enabled = !!b.enabled
  if (b.sortOrder !== undefined) data.sortOrder = Number(b.sortOrder)
  const link = await prisma.resourceLink.update({ where: { id: Number(params.id) }, data })
  return NextResponse.json(link)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  await prisma.resourceLink.delete({ where: { id: Number(params.id) } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
