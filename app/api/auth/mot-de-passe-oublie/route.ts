import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  // Réponse identique que l'utilisateur existe ou non (sécurité)
  if (!user) {
    return NextResponse.json({ success: true })
  }

  // Invalider les tokens précédents non utilisés
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const resetUrl = `${baseUrl}/reinitialiser-mot-de-passe?token=${token}`

  await sendPasswordResetEmail(user.email, user.name, resetUrl)

  return NextResponse.json({ success: true })
}
