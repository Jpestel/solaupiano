import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const planId = Number(params.id)
  const body = await req.json()

  const {
    label, description, priceMonthly, isActive, sortOrder,
    storageGb, maxGroups, maxMembersPerGroup, maxSongsPerGroup,
    maxSetlists, maxConcerts, maxCharts, maxFilesPerSong,
    hasGrilles, hasConcerts, hasSetlists, hasFicheTechnique,
    hasMaPage, hasCoChefs, hasPrioritySupport, hasStats, hasFileSubmissions,
    color,
  } = body

  const plan = await prisma.plan.update({
    where: { id: planId },
    data: {
      ...(label !== undefined && { label: String(label) }),
      ...(description !== undefined && { description: description ? String(description) : null }),
      ...(priceMonthly !== undefined && {
        priceMonthly: priceMonthly !== null && priceMonthly !== '' ? Number(priceMonthly) : null,
      }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(storageGb !== undefined && { storageGb: Number(storageGb) }),
      ...(maxGroups !== undefined && { maxGroups: Number(maxGroups) }),
      ...(maxMembersPerGroup !== undefined && { maxMembersPerGroup: maxMembersPerGroup ? Number(maxMembersPerGroup) : null }),
      ...(maxSongsPerGroup !== undefined && { maxSongsPerGroup: maxSongsPerGroup ? Number(maxSongsPerGroup) : null }),
      ...(maxSetlists !== undefined && { maxSetlists: maxSetlists ? Number(maxSetlists) : null }),
      ...(maxConcerts !== undefined && { maxConcerts: maxConcerts ? Number(maxConcerts) : null }),
      ...(maxCharts !== undefined && { maxCharts: maxCharts ? Number(maxCharts) : null }),
      ...(maxFilesPerSong !== undefined && { maxFilesPerSong: maxFilesPerSong ? Number(maxFilesPerSong) : null }),
      ...(hasGrilles !== undefined && { hasGrilles: Boolean(hasGrilles) }),
      ...(hasConcerts !== undefined && { hasConcerts: Boolean(hasConcerts) }),
      ...(hasSetlists !== undefined && { hasSetlists: Boolean(hasSetlists) }),
      ...(hasFicheTechnique !== undefined && { hasFicheTechnique: Boolean(hasFicheTechnique) }),
      ...(hasMaPage !== undefined && { hasMaPage: Boolean(hasMaPage) }),
      ...(hasCoChefs !== undefined && { hasCoChefs: Boolean(hasCoChefs) }),
      ...(hasPrioritySupport !== undefined && { hasPrioritySupport: Boolean(hasPrioritySupport) }),
      ...(hasStats !== undefined && { hasStats: Boolean(hasStats) }),
      ...(hasFileSubmissions !== undefined && { hasFileSubmissions: Boolean(hasFileSubmissions) }),
      ...(color !== undefined && { color: String(color) }),
    },
  })

  return NextResponse.json({
    ...plan,
    storageGb: Number(plan.storageGb),
    priceMonthly: plan.priceMonthly !== null ? Number(plan.priceMonthly) : null,
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const planId = Number(params.id)

  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) return NextResponse.json({ error: 'Plan introuvable.' }, { status: 404 })

  // Protect default plans that have groups
  const groupCount = await prisma.group.count({ where: { plan: plan.key } })
  if (groupCount > 0) {
    return NextResponse.json({
      error: `Impossible de supprimer ce plan : ${groupCount} groupe${groupCount > 1 ? 's l\'utilisent' : ' l\'utilise'}.`,
    }, { status: 409 })
  }

  await prisma.plan.delete({ where: { id: planId } })
  return NextResponse.json({ ok: true })
}
