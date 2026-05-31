import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupStorageInfo } from '@/lib/storage'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })

  if (!membership && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  let group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            include: {
              instruments: { include: { instrument: true } },
            },
          },
        },
      },
    },
  })

  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  // Auto-assign founder for existing groups that predate this feature
  if (group.createdBy === null) {
    const oldestChef = await prisma.groupMember.findFirst({
      where: { groupId, groupRole: 'CHEF' },
      orderBy: { joinedAt: 'asc' },
    })
    if (oldestChef) {
      await prisma.group.update({ where: { id: groupId }, data: { createdBy: oldestChef.userId } })
      group = { ...group, createdBy: oldestChef.userId }
    }
  }

  // Stockage : l'upload de fichiers est possible si le quota effectif > 0
  const storageInfo = await getGroupStorageInfo(groupId)

  // Fonctionnalités débloquées par le plan du groupe (défaut permissif si pas de plan trouvé)
  const planRec = await prisma.plan.findUnique({
    where: { key: group.plan },
    select: { hasMetronome: true, hasParoles: true, hasGrilles: true, hasSetlists: true, hasConcerts: true, hasFicheTechnique: true, hasMaPage: true, hasStats: true },
  })
  const planFeatures = {
    hasMetronome: planRec?.hasMetronome ?? true,
    hasParoles: planRec?.hasParoles ?? true,
    hasGrilles: planRec?.hasGrilles ?? true,
    hasSetlists: planRec?.hasSetlists ?? true,
    hasConcerts: planRec?.hasConcerts ?? true,
    hasFicheTechnique: planRec?.hasFicheTechnique ?? true,
    hasMaPage: planRec?.hasMaPage ?? true,
    hasStats: planRec?.hasStats ?? true,
  }

  return NextResponse.json({
    ...group,
    storageUsedBytes: String(group.storageUsedBytes),
    uploadEnabled: storageInfo.limitBytes > 0,
    storageLimitBytes: storageInfo.limitBytes,
    storageUsedTotalBytes: storageInfo.usedBytes,
    planFeatures,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })

  if (session.user.siteRole !== 'ADMIN' && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await req.json()
  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      name: body.name,
      description: body.description,
      ...(typeof body.isPublic === 'boolean' && { isPublic: body.isPublic }),
      ...(typeof body.isHidden === 'boolean' && { isHidden: body.isHidden }),
      lookingFor: body.lookingFor ?? null,
      ...('lookingFor' in body && {
        lookingForSince: (() => {
          if (!body.lookingFor) return null
          try { const arr = JSON.parse(body.lookingFor); return arr.length > 0 ? new Date() : null } catch { return null }
        })(),
      }),
    },
  })

  return NextResponse.json({ ...group, storageUsedBytes: String(group.storageUsedBytes) })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdBy: true, _count: { select: { members: true } } },
  })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  // L'admin peut toujours supprimer
  if (!isAdmin) {
    // Sinon, réservé au fondateur du groupe
    if (group.createdBy !== userId) {
      return NextResponse.json({ error: 'Seul le fondateur du groupe peut le supprimer.' }, { status: 403 })
    }
    // Et uniquement s'il est le seul membre
    if (group._count.members > 1) {
      return NextResponse.json({
        error: 'Impossible de supprimer ce groupe : d\'autres membres en font encore partie. Retirez d\'abord tous les autres membres, puis supprimez le groupe.',
        code: 'GROUP_HAS_MEMBERS',
      }, { status: 409 })
    }
  }

  await prisma.group.delete({ where: { id: groupId } })

  return NextResponse.json({ success: true })
}
