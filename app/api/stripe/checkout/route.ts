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
  const { groupId, planKey } = await req.json()

  if (!groupId || !planKey) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 })
  }

  // Vérifier que l'utilisateur est bien chef du groupe
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: Number(groupId) } },
  })
  if (!membership || membership.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  // Récupérer le plan
  const plan = await prisma.plan.findUnique({ where: { key: planKey } })
  if (!plan) return NextResponse.json({ error: 'Plan introuvable.' }, { status: 404 })
  if (!plan.stripePriceId) {
    return NextResponse.json({ error: 'Ce plan n\'est pas encore disponible à la souscription.' }, { status: 400 })
  }
  if (!plan.isActive) {
    return NextResponse.json({ error: 'Plan inactif.' }, { status: 400 })
  }

  // Récupérer le groupe + l'utilisateur
  const [group, user] = await Promise.all([
    prisma.group.findUnique({ where: { id: Number(groupId) } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ])
  if (!group || !user) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  // Vérifier que le stockage actuel rentre dans le nouveau plan
  const newPlanLimitBytes = Number(plan.storageGb) * 1024 * 1024 * 1024
  const usedBytes = Number(group.storageUsedBytes)
  if (usedBytes > newPlanLimitBytes) {
    const usedGb = (usedBytes / (1024 * 1024 * 1024)).toFixed(2)
    return NextResponse.json({
      error: `Votre groupe utilise actuellement ${usedGb} Go de stockage, ce qui dépasse la limite de ${plan.storageGb} Go de ce plan. Libérez de l'espace avant de passer à ce plan.`,
      code: 'STORAGE_EXCEEDS_PLAN',
      usedBytes,
      planLimitBytes: newPlanLimitBytes,
    }, { status: 409 })
  }

  // Créer ou récupérer le customer Stripe
  let customerId = group.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: {
        userId: String(userId),
        groupId: String(groupId),
      },
    })
    customerId = customer.id
    await prisma.group.update({
      where: { id: Number(groupId) },
      data: { stripeCustomerId: customerId },
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'

  // Créer la session Checkout
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${baseUrl}/groupes/${groupId}?stripe=success`,
    cancel_url: `${baseUrl}/groupes/${groupId}?stripe=cancel`,
    metadata: {
      groupId: String(groupId),
      planKey,
    },
    subscription_data: {
      metadata: {
        groupId: String(groupId),
        planKey,
      },
    },
    allow_promotion_codes: true,
    locale: 'fr',
  })

  return NextResponse.json({ url: checkoutSession.url })
}
