import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Inscription publique à la newsletter (aucun compte requis)
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))
  const clean = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(clean)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
  }

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: clean } })
  if (existing) {
    if (!existing.active) {
      await prisma.newsletterSubscriber.update({
        where: { email: clean },
        data: { active: true, unsubscribedAt: null },
      })
    }
    return NextResponse.json({ ok: true, already: existing.active })
  }

  // Lie au compte si un utilisateur a cette adresse
  const user = await prisma.user.findUnique({ where: { email: clean }, select: { id: true } })
  await prisma.newsletterSubscriber.create({
    data: {
      email: clean,
      userId: user?.id ?? null,
      token: crypto.randomUUID(),
      source: 'site',
      active: true,
    },
  })
  return NextResponse.json({ ok: true })
}
