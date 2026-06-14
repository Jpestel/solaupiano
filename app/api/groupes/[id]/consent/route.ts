import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Consentement d'un membre à la diffusion de son visage (photos/vidéos) sur les réseaux.
// Chaque membre gère UNIQUEMENT son propre consentement.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const groupId = Number(params.id)
  const userId = Number(session.user.id)

  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { imageConsent: true, imageConsentAt: true },
  })
  if (!member) return NextResponse.json({ error: 'Vous ne faites pas partie de ce groupe.' }, { status: 403 })

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { plan: true } })
  const plan = group ? await prisma.plan.findUnique({ where: { key: group.plan }, select: { hasSocial: true } }) : null

  return NextResponse.json({
    consent: member.imageConsent ?? null,
    consentAt: member.imageConsentAt,
    hasSocial: plan?.hasSocial ?? true,
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const groupId = Number(params.id)
  const userId = Number(session.user.id)

  const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!member) return NextResponse.json({ error: 'Vous ne faites pas partie de ce groupe.' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (typeof b.consent !== 'boolean') {
    return NextResponse.json({ error: 'Réponse invalide.' }, { status: 400 })
  }

  const updated = await prisma.groupMember.update({
    where: { userId_groupId: { userId, groupId } },
    data: { imageConsent: b.consent, imageConsentAt: new Date() },
    select: { imageConsent: true, imageConsentAt: true },
  })
  return NextResponse.json({ consent: updated.imageConsent, consentAt: updated.imageConsentAt })
}
