import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmailVerification } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })

  // Silent success if user not found (anti-enumeration)
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true })
  }

  // Invalidate existing tokens
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
  await sendEmailVerification(email, user.name, `${baseUrl}/verifier-email?token=${token}`)

  return NextResponse.json({ ok: true })
}
