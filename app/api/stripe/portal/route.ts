import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const { groupId } = await req.json()

  // Vérifier que l'utilisateur est chef
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: Number(groupId) } },
  })
  if (!membership || membership.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const group = await prisma.group.findUnique({ where: { id: Number(groupId) } })
  if (!group?.stripeCustomerId) {
    return NextResponse.json({ error: 'Aucun abonnement actif.' }, { status: 404 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: group.stripeCustomerId,
    return_url: `${baseUrl}/groupes/${groupId}`,
  })

  return NextResponse.json({ url: portalSession.url })
}
