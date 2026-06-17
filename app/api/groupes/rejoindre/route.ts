import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendGroupWelcomeEmail } from '@/lib/email'

// Rejoindre un groupe via son lien d'invitation (token partagé par email/SMS/WhatsApp).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { token } = await req.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 })

  const userId = Number(session.user.id)
  if (session.user.siteRole === 'ADMIN') {
    return NextResponse.json({ error: "L'administrateur du site ne peut pas rejoindre un groupe." }, { status: 400 })
  }

  const group = await prisma.group.findUnique({
    where: { inviteToken: String(token) },
    select: { id: true, name: true, type: true, archivedAt: true },
  })
  if (!group || group.archivedAt) {
    return NextResponse.json({ error: "Ce lien d'invitation n'est plus valide." }, { status: 404 })
  }

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  })
  if (existing) {
    // Déjà membre : idempotent, on renvoie simplement le groupe.
    return NextResponse.json({ groupId: group.id, alreadyMember: true })
  }

  await prisma.groupMember.create({
    data: { userId, groupId: group.id, groupRole: 'MEMBRE' },
  })

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  if (me) {
    sendGroupWelcomeEmail(me.email, me.name, group.name, group.id, me.name, baseUrl, group.type).catch(() => {})
  }

  return NextResponse.json({ groupId: group.id })
}
