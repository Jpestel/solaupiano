import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant.' }, { status: 400 })

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } })

  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ])

  return NextResponse.redirect(new URL('/connexion?verified=1', req.url))
}
