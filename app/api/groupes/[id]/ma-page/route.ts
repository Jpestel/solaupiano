import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ─── Slug utils ──────────────────────────────────────────────────────────────

const RESERVED = new Set([
  'api', 'auth', 'tableau-de-bord', 'groupes', 'profil', 'calendrier',
  'outils', 'aide', 'admin', 'fiche', 'inscription', 'connexion',
  'groupe-page', '_next', 'static',
])

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'groupe'
}

async function findUniqueSlug(base: string, excludeGroupId: number): Promise<string> {
  if (RESERVED.has(base)) base = `groupe-${base}`
  const existing = await prisma.groupPage.findUnique({ where: { slug: base } })
  if (!existing || existing.groupId === excludeGroupId) return base

  const similar = await prisma.groupPage.findMany({
    where: { slug: { startsWith: base + '-' } },
    select: { slug: true },
  })
  const usedNums = new Set(similar.map(s => parseInt(s.slug.replace(base + '-', ''))))
  let i = 1
  while (usedNums.has(i)) i++
  return `${base}-${i}`
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function checkAccess(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return 'CHEF'
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  return m?.groupRole ?? null
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const role = await checkAccess(userId, groupId, isAdmin)
  if (!role) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [group, groupPage, members, concerts] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.groupPage.findUnique({ where: { groupId } }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, avatarUrl: true, instruments: { include: { instrument: true } } } } },
    }),
    prisma.concert.findMany({
      where: { groupId, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, name: true, date: true, location: true },
    }),
  ])

  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  // Auto-generate slug if no page yet
  let suggestedSlug = groupPage?.slug
  if (!suggestedSlug) {
    suggestedSlug = await findUniqueSlug(slugify(group.name), groupId)
  }

  return NextResponse.json({
    groupName: group.name,
    role,
    page: groupPage ?? null,
    suggestedSlug,
    members: members.map(m => ({
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      instruments: m.user.instruments.map(ui => ui.instrument.name),
    })),
    upcomingConcerts: concerts.map(c => ({ ...c, date: c.date.toISOString() })),
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const role = await checkAccess(userId, groupId, isAdmin)
  if (role !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const body = await req.json()
  let { slug, ...rest } = body

  // Validate and ensure unique slug
  slug = slugify(slug || '')
  if (!slug) return NextResponse.json({ error: 'Slug invalide.' }, { status: 400 })
  if (RESERVED.has(slug)) return NextResponse.json({ error: 'Ce nom d\'URL est réservé.' }, { status: 400 })

  // Check slug not taken by another group
  const conflict = await prisma.groupPage.findUnique({ where: { slug } })
  if (conflict && conflict.groupId !== groupId) {
    return NextResponse.json({ error: 'Cette URL est déjà utilisée par un autre groupe.' }, { status: 409 })
  }

  const page = await prisma.groupPage.upsert({
    where: { groupId },
    update: { slug, ...rest },
    create: { groupId, slug, ...rest },
  })

  return NextResponse.json(page)
}
