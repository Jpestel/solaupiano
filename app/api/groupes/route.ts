import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  const memberships = await prisma.groupMember.findMany({
    where: { userId, group: { archivedAt: null } },
    include: {
      group: {
        include: {
          _count: { select: { members: true, rehearsals: true, songs: true } },
        },
      },
    },
  })

  return NextResponse.json(memberships)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const body = await req.json()
  const { name, description, style, chefId, isPublic, isHidden, lookingFor, type } = body
  const groupType = type === 'SCHOOL' ? 'SCHOOL' : 'BAND'

  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  const isAdmin = session.user.siteRole === 'ADMIN'

  // Musiciens (non-créateurs) cannot create groups
  if (!isAdmin && session.user.userPlan !== 'CREATEUR') {
    return NextResponse.json(
      { error: 'Votre plan Musicien ne permet pas de créer un groupe. Passez au plan Créateur depuis votre profil.' },
      { status: 403 }
    )
  }

  // Un co-chef ne peut pas créer son propre groupe : ce statut (proche de celui
  // de chef) ne vaut que pour le groupe dont il est co-chef. Il doit d'abord
  // quitter ce rôle pour créer le sien.
  if (!isAdmin) {
    const myId = Number(session.user.id)
    const chefMemberships = await prisma.groupMember.findMany({
      where: { userId: myId, groupRole: 'CHEF' },
      include: { group: { select: { name: true, createdBy: true } } },
    })
    const coChefOf = chefMemberships.filter((m) => m.group.createdBy !== myId)
    if (coChefOf.length > 0) {
      const names = coChefOf.map((m) => `« ${m.group.name} »`).join(', ')
      return NextResponse.json(
        {
          error: `Vous êtes co-chef du groupe ${names}. Un co-chef ne peut pas créer son propre groupe : ce rôle ne concerne que ce groupe. Pour créer le vôtre, quittez d'abord votre rôle de co-chef.`,
          code: 'COCHEF_CONFLICT',
        },
        { status: 403 }
      )
    }
  }

  // Limite du nombre de groupes gérés : déterminée par le MEILLEUR plan parmi les
  // groupes que l'utilisateur a fondés (même logique que le stockage mutualisé).
  // Plan Gratuit = 1, Pro/Premium = 5. Un groupe offert en Premium par l'admin
  // relève donc la limite.
  if (!isAdmin) {
    const myId = Number(session.user.id)
    const foundedGroups = await prisma.group.findMany({
      where: { createdBy: myId },
      select: { plan: true },
    })
    let maxGroups = 1 // défaut : plan Gratuit
    if (foundedGroups.length > 0) {
      const plans = await prisma.plan.findMany({
        where: { key: { in: foundedGroups.map((g) => g.plan) } },
        select: { maxGroups: true },
      })
      maxGroups = Math.max(1, ...plans.map((p) => p.maxGroups))
    }
    const existingGroupsCount = await prisma.groupMember.count({
      where: { userId: myId, groupRole: 'CHEF' },
    })
    if (existingGroupsCount >= maxGroups) {
      return NextResponse.json(
        {
          error: maxGroups <= 1
            ? `Votre plan Gratuit vous permet de gérer 1 groupe maximum. Pour en gérer davantage, faites passer l'un de vos groupes en Pro ou Premium.`
            : `Vous gérez déjà le maximum de ${maxGroups} groupes autorisé par votre plan.`,
          code: 'GROUP_LIMIT_REACHED',
        },
        { status: 403 }
      )
    }
  }

  // If chefId provided (admin panel), use it — otherwise the creator becomes CHEF
  const chefUserId = chefId ? Number(chefId) : Number(session.user.id)

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      type: groupType,
      description: description?.trim() || undefined,
      style: typeof style === 'string' && style.trim() ? style.trim() : undefined,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
      isHidden: typeof isHidden === 'boolean' ? isHidden : false,
      lookingFor: lookingFor ?? null,
      lookingForSince: lookingFor ? new Date() : null,
      createdBy: chefUserId || null,
      ...(chefUserId && {
        members: {
          create: { userId: chefUserId, groupRole: 'CHEF' },
        },
      }),
    },
  })

  return NextResponse.json({ ...group, storageUsedBytes: String(group.storageUsedBytes) }, { status: 201 })
}
