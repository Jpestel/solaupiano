import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

const ALLOWED_MODULES = new Set([
  'repetitions',
  'concerts',
  'taches',
  'morceaux',
  'setlists',
  'grilles',
  'partitions-carrees',
  'fiche-technique',
  'ma-page',
  'tchat',
  'ressources-partagees',
  'disponibilites',
  'sondages',
  'comptabilite',
  'galerie',
  'social',
])

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const { order } = await req.json()

  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Groupe invalide.' }, { status: 400 })
  }

  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'Format invalide.' }, { status: 400 })
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdBy: true, chefPermissions: true },
  })

  if (!group) {
    return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })
  }

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { groupRole: true },
  })

  if (!isAdmin && membership?.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Action non autorisée.' }, { status: 403 })
  }

  const canReorder = coChefCanDo(
    { createdBy: group.createdBy ?? null, chefPermissions: group.chefPermissions ?? null },
    userId,
    isAdmin,
    'modules',
    'reorder'
  )

  if (!canReorder) {
    return NextResponse.json({ error: 'Permission insuffisante.' }, { status: 403 })
  }

  const sanitizedOrder = Array.from(new Set(
    order.filter((href): href is string => typeof href === 'string' && ALLOWED_MODULES.has(href))
  ))

  await prisma.group.update({
    where: { id: groupId },
    data: { moduleOrder: JSON.stringify(sanitizedOrder) },
  })

  return NextResponse.json({ ok: true, order: sanitizedOrder })
}
