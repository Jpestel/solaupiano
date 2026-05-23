import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Appelé chaque nuit par le cron serveur
// Repasse en FREE tous les groupes dont le plan offert a expiré
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const now = new Date()

  // Trouver tous les groupes avec un plan expiré (hors FREE et hors abonnement Stripe actif)
  const expired = await prisma.group.findMany({
    where: {
      planExpiresAt: { lte: now },
      plan: { not: 'FREE' },
      stripeSubscriptionId: null, // ne pas toucher aux abonnements Stripe payants
    },
    select: { id: true, name: true, plan: true, planExpiresAt: true },
  })

  if (expired.length === 0) {
    return NextResponse.json({ downgraded: 0, message: 'Aucun plan expiré.' })
  }

  // Downgrade en FREE + effacer la date d'expiration
  await prisma.group.updateMany({
    where: { id: { in: expired.map((g) => g.id) } },
    data: { plan: 'FREE', planExpiresAt: null },
  })

  console.log(`[expire-plans] ${expired.length} groupe(s) repassés en FREE :`, expired.map((g) => `${g.name} (id:${g.id})`))

  return NextResponse.json({
    downgraded: expired.length,
    groups: expired.map((g) => ({ id: g.id, name: g.name, wasPlan: g.plan, expiredAt: g.planExpiresAt })),
  })
}
