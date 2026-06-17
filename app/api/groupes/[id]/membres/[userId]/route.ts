import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

// PATCH — change a member's group role (CHEF ↔ MEMBRE)
// Allowed by: site ADMIN or current CHEF of the group
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const targetUserId = Number(params.userId)
  const requesterId = Number(session.user.id)

  const isAdmin = session.user.siteRole === 'ADMIN'
  // Site admins OR chefs of the group can change member roles
  if (!isAdmin) {
    const requesterMembership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: requesterId, groupId } },
    })
    if (requesterMembership?.groupRole !== 'CHEF') {
      return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
    }
  }

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, requesterId, isAdmin, 'membres', 'promote')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const { groupRole } = await req.json()
  if (!['CHEF', 'MEMBRE'].includes(groupRole)) {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }

  // Dans une école, pas de co-chef : seul le professeur (fondateur) gère.
  if (groupRole === 'CHEF') {
    const g = await prisma.group.findUnique({ where: { id: groupId }, select: { type: true } })
    if (g?.type === 'SCHOOL') {
      return NextResponse.json({ error: 'Dans une école, seul le professeur gère la classe : un élève ne peut pas être nommé co-chef.' }, { status: 400 })
    }
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!targetUser) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  if (targetUser.siteRole === 'ADMIN') {
    return NextResponse.json({ error: 'Un administrateur ne peut pas être chef de groupe.' }, { status: 400 })
  }

  const target = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  })
  if (!target) return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 })

  const updated = await prisma.groupMember.update({
    where: { userId_groupId: { userId: targetUserId, groupId } },
    data: { groupRole },
  })

  return NextResponse.json(updated)
}
