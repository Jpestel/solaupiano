import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupStorageInfo } from '@/lib/storage'
import { cleanupGroupFiles } from '@/lib/file-cleanup'
import { resolveGroupFeatures } from '@/lib/group-feature'

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

  // Groupe archivé : invisible pour les membres (réservé à l'admin)
  if (group.archivedAt && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Ce groupe a été archivé.', code: 'GROUP_ARCHIVED' }, { status: 410 })
  }

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

  // Fonctionnalités actives pour CE groupe et CETTE personne : réglage de base du
  // plan, surchargé par les dérogations de l'administrateur (groupe, puis utilisateur).
  const planFeatures = await resolveGroupFeatures(groupId, userId)

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
      ...('name' in body && { name: body.name }),
      ...('description' in body && { description: body.description }),
      ...('studentModules' in body && {
        studentModules: Array.isArray(body.studentModules)
          ? JSON.stringify(body.studentModules.filter((x: unknown) => typeof x === 'string'))
          : null,
      }),
      ...('style' in body && { style: typeof body.style === 'string' && body.style.trim() ? body.style.trim() : null }),
      ...(typeof body.isPublic === 'boolean' && { isPublic: body.isPublic }),
      ...(typeof body.isHidden === 'boolean' && { isHidden: body.isHidden }),
      ...(['HIDDEN', 'PRIVATE', 'PUBLIC'].includes(body.peerRatingVisibility) && { peerRatingVisibility: body.peerRatingVisibility }),
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

  // Nettoie tous les fichiers du groupe sur le disque avant suppression
  await cleanupGroupFiles(groupId)
  await prisma.group.delete({ where: { id: groupId } })

  return NextResponse.json({ success: true })
}
