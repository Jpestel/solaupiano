import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendInvitationEmail } from '@/lib/email'
import { coChefCanDo } from '@/lib/permissions'
import { signAccessToken } from '@/lib/acces'

/**
 * Invitation à créer un compte.
 *
 * Avec `groupId`, le lien envoyé est celui du groupe (/rejoindre/<jeton>) et non
 * une inscription nue : sans cela, la personne crée son compte et se retrouve
 * sans aucun moyen de retrouver le groupe — rien ne la rattache à lui.
 * Sans `groupId`, l'invitation est une invitation personnelle de l'éditeur :
 * le lien porte un jeton d'accès signé, lié à l'adresse invitée. L'inscription
 * étant réservée aux invités, un membre ordinaire ne peut pas en émettre —
 * il invite depuis son groupe.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { email, message, groupId } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  let signupUrl = ''
  let groupName: string | null = null

  if (groupId !== undefined && groupId !== null && groupId !== '') {
    const id = Number(groupId)
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Groupe invalide.' }, { status: 400 })

    // Mêmes droits que pour l'ajout d'un membre : on n'envoie pas le lien d'un
    // groupe que l'on n'a pas le droit de peupler.
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: id } },
    })
    if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    const group = await prisma.group.findUnique({
      where: { id },
      select: { name: true, inviteToken: true, archivedAt: true, createdBy: true, chefPermissions: true },
    })
    if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })
    if (group.archivedAt) return NextResponse.json({ error: 'Ce groupe est archivé.' }, { status: 400 })
    if (!coChefCanDo(group, userId, isAdmin, 'membres', 'add')) {
      return NextResponse.json({ error: 'Le fondateur ne vous autorise pas à inviter des membres.' }, { status: 403 })
    }

    // Le lien d'invitation peut ne jamais avoir été généré : on le crée ici.
    let token = group.inviteToken
    if (!token) {
      token = crypto.randomBytes(16).toString('hex')
      await prisma.group.update({ where: { id }, data: { inviteToken: token } })
    }

    signupUrl = `${baseUrl}/rejoindre/${token}`
    groupName = group.name
  }

  if (!signupUrl) {
    // Pas de groupe : seule l'éditeur peut ouvrir un accès de sa propre initiative.
    if (!isAdmin) {
      return NextResponse.json({
        error: "L'inscription est réservée aux personnes invitées. Invitez depuis votre groupe : "
          + 'ouvrez-le, puis « Inviter ». Le lien du groupe sera envoyé avec l\'invitation.',
      }, { status: 403 })
    }
    signupUrl = `${baseUrl}/inscription?acces=${encodeURIComponent(signAccessToken(email))}`
  }

  await sendInvitationEmail(
    email,
    session.user.name ?? 'Un musicien',
    message?.trim() || null,
    signupUrl,
    groupName,
  )

  return NextResponse.json({ ok: true, groupName })
}
