import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  const [user, groupCount, foundedGroupsCount, masterCount, nextRehearsal, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { instruments: { include: { instrument: true } } },
    }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.group.count({ where: { createdBy: userId } }),
    prisma.userSongProgress.count({ where: { userId, status: 'MAITRISE' } }),
    prisma.rehearsal.findFirst({
      where: {
        date: { gte: new Date() },
        group: { members: { some: { userId } } },
      },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, location: true, groupId: true, group: { select: { name: true } } },
    }),
    prisma.groupMember.findMany({
      where: { userId },
      select: {
        groupRole: true,
        group: { select: { id: true, name: true, createdBy: true, coverUrl: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const myGroups = memberships.map(m => ({
    id: m.group.id,
    name: m.group.name,
    coverUrl: m.group.coverUrl,
    groupRole: m.groupRole,
    isFounder: m.group.createdBy === userId,
  }))

  const nlSub = await prisma.newsletterSubscriber.findUnique({ where: { email: user.email }, select: { active: true } })

  // Quota de groupes gérables = meilleur plan parmi les groupes fondés (Gratuit=1, Pro/Premium=5)
  const foundedPlans = await prisma.group.findMany({ where: { createdBy: userId }, select: { plan: true } })
  let maxGroups = 1
  if (foundedPlans.length > 0) {
    const plans = await prisma.plan.findMany({
      where: { key: { in: foundedPlans.map((g) => g.plan) } },
      select: { maxGroups: true },
    })
    maxGroups = Math.max(1, ...plans.map((p) => p.maxGroups))
  }
  const managedGroupsCount = await prisma.groupMember.count({ where: { userId, groupRole: 'CHEF' } })

  const { password, ...safeUser } = user
  return NextResponse.json({
    ...safeUser,
    newsletterSubscribed: !!nlSub?.active,
    foundedGroupsCount,
    groupQuota: { managed: managedGroupsCount, max: maxGroups },
    myGroups,
    stats: {
      groupCount,
      foundedGroupsCount,
      masterCount,
      nextRehearsal: nextRehearsal
        ? { ...nextRehearsal, date: nextRehearsal.date.toISOString() }
        : null,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const { name, instrumentIds, userPlan, weeklyDigestOptOut, rehearsalReminderOptOut, evaluationReminderOptOut, helpBubblesOptOut, gusoNumber, stageFigure, stageColor, stageName } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  }

  const validPlans = ['MUSICIEN', 'CREATEUR']
  // Interdit le retour au plan Musicien tant que l'utilisateur est fondateur d'un groupe
  if (userPlan === 'MUSICIEN') {
    const foundedGroups = await prisma.group.count({ where: { createdBy: userId } })
    if (foundedGroups > 0) {
      return NextResponse.json({
        error: 'Vous ne pouvez pas repasser en plan Musicien tant que vous êtes chef d\'un groupe. Supprimez ou transférez vos groupes d\'abord.',
        code: 'STILL_FOUNDER',
      }, { status: 409 })
    }
  }
  const planData = userPlan && validPlans.includes(userPlan) ? { userPlan } : {}
  const digestData = typeof weeklyDigestOptOut === 'boolean' ? { weeklyDigestOptOut } : {}
  const reminderData = typeof rehearsalReminderOptOut === 'boolean' ? { rehearsalReminderOptOut } : {}
  const evalReminderData = typeof evaluationReminderOptOut === 'boolean' ? { evaluationReminderOptOut } : {}
  const helpBubblesData = typeof helpBubblesOptOut === 'boolean' ? { helpBubblesOptOut } : {}
  const gusoData = gusoNumber !== undefined ? { gusoNumber: gusoNumber?.trim() || null } : {}
  const figureData = typeof stageFigure === 'string' && stageFigure ? { stageFigure } : {}
  const stageColorData = stageColor !== undefined ? { stageColor: (typeof stageColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(stageColor)) ? stageColor : null } : {}
  const stageNameData = stageName !== undefined ? { stageName: (typeof stageName === 'string' && stageName.trim()) ? stageName.trim().slice(0, 40) : null } : {}

  // Update user and instruments in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), ...planData, ...digestData, ...reminderData, ...evalReminderData, ...helpBubblesData, ...gusoData, ...figureData, ...stageColorData, ...stageNameData },
    }),
    prisma.userInstrument.deleteMany({ where: { userId } }),
    ...(Array.isArray(instrumentIds) && instrumentIds.length > 0
      ? [
          prisma.userInstrument.createMany({
            data: instrumentIds.map((id: number) => ({ userId, instrumentId: id })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ])

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: { instruments: { include: { instrument: true } } },
  })

  const { password, ...safeUser } = updated!
  return NextResponse.json(safeUser)
}
