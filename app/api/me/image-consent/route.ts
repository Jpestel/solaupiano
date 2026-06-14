import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — droit à l'image de l'utilisateur pour chacun de ses groupes (où le module Réseaux est actif).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json([], { status: 200 })
  const userId = Number(session.user.id)

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true, imageConsent: true, group: { select: { name: true, plan: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  const planKeys = Array.from(new Set(memberships.map((m) => m.group.plan)))
  const plans = planKeys.length
    ? await prisma.plan.findMany({ where: { key: { in: planKeys } }, select: { key: true, hasSocial: true } })
    : []
  const hasSocialByPlan = Object.fromEntries(plans.map((p) => [p.key, p.hasSocial]))

  const list = memberships
    .filter((m) => hasSocialByPlan[m.group.plan] ?? true)
    .map((m) => ({ groupId: m.groupId, groupName: m.group.name, consent: m.imageConsent ?? null }))
  return NextResponse.json(list)
}

// PUT { groupId, consent } — met à jour le droit à l'image pour un groupe.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const b = await req.json().catch(() => ({}))
  const groupId = Number(b.groupId)
  if (!Number.isInteger(groupId) || typeof b.consent !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 })
  }
  const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!member) return NextResponse.json({ error: 'Vous ne faites pas partie de ce groupe.' }, { status: 403 })

  await prisma.groupMember.update({
    where: { userId_groupId: { userId, groupId } },
    data: { imageConsent: b.consent, imageConsentAt: new Date() },
  })
  return NextResponse.json({ groupId, consent: b.consent })
}
