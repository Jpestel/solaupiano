import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureResourceLinksSeeded } from '@/lib/resource-links-server'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  await ensureResourceLinksSeeded()
  const links = await prisma.resourceLink.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json()
  if (!b.label?.trim() || !b.urlTemplate?.trim()) {
    return NextResponse.json({ error: 'Libellé et URL requis.' }, { status: 400 })
  }
  const agg = await prisma.resourceLink.aggregate({ _max: { sortOrder: true } })
  const link = await prisma.resourceLink.create({
    data: {
      label: String(b.label).trim(),
      icon: b.icon?.trim() || '🔗',
      category: b.category || 'OTHER',
      urlTemplate: String(b.urlTemplate).trim(),
      description: b.description?.trim() || null,
      defaultActive: !!b.defaultActive,
      enabled: b.enabled !== false,
      sortOrder: (agg._max.sortOrder ?? 0) + 1,
    },
  })
  return NextResponse.json(link, { status: 201 })
}
