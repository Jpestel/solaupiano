import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  return null
}

const TYPES = ['INFO', 'ASTUCE', 'NEWS', 'ALERTE']
const UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH']
const toDateOrNull = (s: unknown) => (s ? new Date(String(s)) : null)

export async function GET() {
  const err = await requireAdmin()
  if (err) return err
  const items = await prisma.flashInfo.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { views: true } } },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin()
  if (err) return err
  const b = await req.json()
  if (!b.title?.trim() || !b.content?.trim()) {
    return NextResponse.json({ error: 'Titre et contenu obligatoires.' }, { status: 400 })
  }
  const created = await prisma.flashInfo.create({
    data: {
      type: TYPES.includes(b.type) ? b.type : 'INFO',
      title: String(b.title).trim().slice(0, 191),
      content: String(b.content).trim(),
      ctaLabel: b.ctaLabel?.trim() || null,
      ctaUrl: b.ctaUrl?.trim() || null,
      active: b.active !== false,
      startAt: toDateOrNull(b.startAt),
      endAt: toDateOrNull(b.endAt),
      recurring: !!b.recurring,
      intervalValue: Math.max(1, Number(b.intervalValue) || 1),
      intervalUnit: UNITS.includes(b.intervalUnit) ? b.intervalUnit : 'DAY',
      maxDisplays: b.maxDisplays ? Math.max(1, Number(b.maxDisplays)) : null,
      priority: Number(b.priority) || 0,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
