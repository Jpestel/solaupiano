import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmailVerification } from '@/lib/email'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const userId = Number(params.id)
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Utilisateur invalide.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  })

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true })

  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  const token = crypto.randomBytes(32).toString('hex')
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  await sendEmailVerification(user.email, user.name, `${baseUrl}/verifier-email?token=${token}`)

  return NextResponse.json({ ok: true })
}
