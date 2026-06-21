import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNewsletterToSubscribers } from '@/lib/email'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

// Détail d'une newsletter : qui l'a reçue, et quels abonnés actifs ne l'ont pas reçue.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 })

  const newsletter = await prisma.newsletter.findUnique({ where: { id } })
  if (!newsletter) return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 })

  const [recipients, activeSubscribers] = await Promise.all([
    prisma.newsletterRecipient.findMany({
      where: { newsletterId: id },
      orderBy: { sentAt: 'asc' },
      select: { subscriberId: true, email: true, sentAt: true },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, createdAt: true },
    }),
  ])

  const receivedIds = new Set(recipients.map((r) => r.subscriberId))
  const missing = activeSubscribers.filter((s) => !receivedIds.has(s.id))

  return NextResponse.json({
    newsletter: { id: newsletter.id, subject: newsletter.subject, status: newsletter.status },
    recipients,                 // abonnés ayant déjà reçu cette news
    missing,                    // abonnés actifs ne l'ayant pas (encore) reçue
  })
}

// Renvoie la même newsletter à une sélection d'abonnés, ou à tous les manquants.
// Body : { subscriberIds?: number[] }  (absent ⇒ tous les abonnés actifs manquants)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 })

  const newsletter = await prisma.newsletter.findUnique({ where: { id } })
  if (!newsletter) return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const explicitIds: number[] | null = Array.isArray(body?.subscriberIds)
    ? body.subscriberIds.map(Number).filter(Number.isInteger)
    : null
  // markReceived : enregistre les destinataires SANS envoyer d'email
  // (utile pour les news envoyées avant la mise en place du suivi).
  const markReceived = body?.markReceived === true

  // Abonnés ayant déjà reçu cette news → exclus pour éviter tout doublon.
  const already = await prisma.newsletterRecipient.findMany({
    where: { newsletterId: id },
    select: { subscriberId: true },
  })
  const alreadyIds = new Set(already.map((r) => r.subscriberId))

  // Cibles : sélection explicite (filtrée aux actifs) ou tous les actifs manquants.
  const targets = await prisma.newsletterSubscriber.findMany({
    where: {
      active: true,
      ...(explicitIds ? { id: { in: explicitIds } } : {}),
    },
    select: { id: true, email: true, token: true },
  })
  const toSend = targets.filter((s) => !alreadyIds.has(s.id))

  if (toSend.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'Aucun destinataire à servir (déjà reçus ou inactifs).' })
  }

  // Marquage sans envoi : on trace les destinataires comme reçus, sans email.
  if (markReceived) {
    await prisma.newsletterRecipient.createMany({
      data: toSend.map((s) => ({ newsletterId: id, subscriberId: s.id, email: s.email })),
      skipDuplicates: true,
    })
    await prisma.newsletter.update({
      where: { id },
      data: { recipientCount: { increment: toSend.length } },
    })
    return NextResponse.json({ ok: true, marked: toSend.length })
  }

  const delivered = await sendNewsletterToSubscribers(newsletter.subject, newsletter.content, toSend)

  if (delivered.length) {
    await prisma.newsletterRecipient.createMany({
      data: delivered.map((d) => ({ newsletterId: id, subscriberId: d.id, email: d.email })),
      skipDuplicates: true,
    })
    await prisma.newsletter.update({
      where: { id },
      data: { recipientCount: { increment: delivered.length } },
    })
  }

  return NextResponse.json({ ok: true, sent: delivered.length })
}

// Supprime uniquement un brouillon. Une newsletter envoyée reste conservée pour l'historique.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 })

  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!newsletter) return NextResponse.json({ error: 'Newsletter introuvable.' }, { status: 404 })
  if (newsletter.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Seuls les brouillons peuvent être supprimés.' }, { status: 400 })
  }

  await prisma.newsletter.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
