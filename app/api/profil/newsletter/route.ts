import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (!user) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const { subscribe } = await req.json()
  const email = user.email.toLowerCase()

  if (subscribe) {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { active: true, unsubscribedAt: null, userId },
      create: { email, userId, token: crypto.randomUUID(), source: 'profil', active: true },
    })
  } else {
    await prisma.newsletterSubscriber.updateMany({
      where: { email },
      data: { active: false, unsubscribedAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true, subscribed: !!subscribe })
}
