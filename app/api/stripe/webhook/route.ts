import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Disable body parsing — Stripe needs the raw body for signature verification
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Configuration webhook manquante.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature invalide:', err)
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // Paiement initial réussi → activer le plan
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession
        const groupId = Number(session.metadata?.groupId)
        const planKey = session.metadata?.planKey
        const subscriptionId = session.subscription as string | null

        if (groupId && planKey) {
          await prisma.group.update({
            where: { id: groupId },
            data: {
              plan: planKey,
              stripeSubscriptionId: subscriptionId ?? undefined,
            },
          })
          console.log(`[Stripe] Groupe ${groupId} passé au plan ${planKey}`)
        }
        break
      }

      // Abonnement mis à jour (changement de plan, renouvellement…)
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const groupId = Number(sub.metadata?.groupId)
        const planKey = sub.metadata?.planKey

        if (groupId && planKey && sub.status === 'active') {
          await prisma.group.update({
            where: { id: groupId },
            data: { plan: planKey, stripeSubscriptionId: sub.id },
          })
          console.log(`[Stripe] Abonnement mis à jour — groupe ${groupId} → ${planKey}`)
        }
        break
      }

      // Abonnement annulé ou expiré → retour au FREE
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const groupId = Number(sub.metadata?.groupId)

        if (groupId) {
          await prisma.group.update({
            where: { id: groupId },
            data: { plan: 'FREE', stripeSubscriptionId: null },
          })
          console.log(`[Stripe] Abonnement résilié — groupe ${groupId} repassé en FREE`)
        }
        break
      }

      // Paiement échoué
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription as string)
          : null
        const groupId = sub ? Number(sub.metadata?.groupId) : null
        if (groupId) {
          console.warn(`[Stripe] Paiement échoué pour le groupe ${groupId}`)
          // On ne rétrograde pas immédiatement — Stripe retente automatiquement
        }
        break
      }

      default:
        // Ignorer les autres événements
        break
    }
  } catch (err) {
    console.error('[Stripe webhook] Erreur lors du traitement:', err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
