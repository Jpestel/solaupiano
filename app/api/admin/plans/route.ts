import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_PLAN_SEEDS } from '@/lib/plans'

export const dynamic = 'force-dynamic'

async function ensurePlansSeeded() {
  const count = await prisma.plan.count()
  if (count === 0) {
    await prisma.plan.createMany({ data: DEFAULT_PLAN_SEEDS })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  await ensurePlansSeeded()

  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  // Count groups using each plan
  const groups = await prisma.group.groupBy({
    by: ['plan'],
    _count: { id: true },
  })
  const groupCountByPlan = Object.fromEntries(groups.map((g) => [g.plan, g._count.id]))

  return NextResponse.json(plans.map((p) => ({
    ...p,
    storageGb: Number(p.storageGb),
    priceMonthly: p.priceMonthly !== null ? Number(p.priceMonthly) : null,
    groupCount: groupCountByPlan[p.key] ?? 0,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const {
    key, label, description, priceMonthly, isActive, sortOrder,
    storageGb, maxGroups, maxMembersPerGroup, maxSongsPerGroup,
    maxSetlists, maxConcerts, maxCharts, maxFilesPerSong,
    hasGrilles, hasConcerts, hasSetlists, hasFicheTechnique,
    hasMaPage, hasCoChefs, hasPrioritySupport, hasStats, hasFileSubmissions,
    hasMetronome, hasParoles,
    color,
  } = body

  if (!key || !label) {
    return NextResponse.json({ error: 'Clé et nom obligatoires.' }, { status: 400 })
  }

  const cleanKey = String(key).toUpperCase().replace(/[^A-Z0-9_]/g, '_')

  const existing = await prisma.plan.findUnique({ where: { key: cleanKey } })
  if (existing) {
    return NextResponse.json({ error: `La clé "${cleanKey}" existe déjà.` }, { status: 409 })
  }

  const plan = await prisma.plan.create({
    data: {
      key: cleanKey,
      label: String(label),
      description: description ? String(description) : null,
      priceMonthly: priceMonthly !== null && priceMonthly !== '' ? Number(priceMonthly) : null,
      isActive: Boolean(isActive ?? true),
      sortOrder: Number(sortOrder ?? 0),
      storageGb: Number(storageGb ?? 1),
      maxGroups: Number(maxGroups ?? 1),
      maxMembersPerGroup: maxMembersPerGroup ? Number(maxMembersPerGroup) : null,
      maxSongsPerGroup: maxSongsPerGroup ? Number(maxSongsPerGroup) : null,
      maxSetlists: maxSetlists ? Number(maxSetlists) : null,
      maxConcerts: maxConcerts ? Number(maxConcerts) : null,
      maxCharts: maxCharts ? Number(maxCharts) : null,
      maxFilesPerSong: maxFilesPerSong ? Number(maxFilesPerSong) : null,
      hasGrilles: Boolean(hasGrilles ?? true),
      hasConcerts: Boolean(hasConcerts ?? true),
      hasSetlists: Boolean(hasSetlists ?? true),
      hasFicheTechnique: Boolean(hasFicheTechnique ?? true),
      hasMaPage: Boolean(hasMaPage ?? true),
      hasCoChefs: Boolean(hasCoChefs ?? true),
      hasPrioritySupport: Boolean(hasPrioritySupport ?? false),
      hasStats: Boolean(hasStats ?? false),
      hasMetronome: Boolean(hasMetronome ?? true),
      hasParoles: Boolean(hasParoles ?? true),
      // L'upload de fichiers est possible ⟺ quota de stockage > 0 (source unique de vérité)
      hasFileSubmissions: Number(storageGb ?? 1) > 0,
      color: String(color ?? 'gray'),
    },
  })

  return NextResponse.json(plan, { status: 201 })
}
