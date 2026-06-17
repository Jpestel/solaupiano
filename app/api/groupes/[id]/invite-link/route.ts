import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

// Génère (ou régénère) le lien d'invitation partageable du groupe.
// Réservé au chef/prof (ou co-chef autorisé à ajouter des membres) et à l'admin.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const grp = await prisma.group.findUnique({
    where: { id: groupId },
    select: { createdBy: true, chefPermissions: true, inviteToken: true },
  })
  if (!grp) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })
  if (!coChefCanDo(grp, userId, isAdmin, 'membres', 'add')) {
    return NextResponse.json({ error: 'Le fondateur ne vous autorise pas à inviter des membres.' }, { status: 403 })
  }

  const { regenerate } = await req.json().catch(() => ({}))

  let token = grp.inviteToken
  if (!token || regenerate) {
    token = crypto.randomBytes(16).toString('hex')
    await prisma.group.update({ where: { id: groupId }, data: { inviteToken: token } })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  return NextResponse.json({ url: `${baseUrl}/rejoindre/${token}` })
}
