import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmailVerification, sendNewUserNotification } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, instrumentIds, otherInstrument, userPlan } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà.' }, { status: 409 })
    }

    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0

    const hashedPassword = await bcrypt.hash(password, 12)

    // Resolve "other" instrument — reuse existing or create new
    const allInstrumentIds: number[] = Array.isArray(instrumentIds) ? [...instrumentIds] : []
    if (otherInstrument?.trim()) {
      const trimmed = otherInstrument.trim()
      const existing = await prisma.instrument.findFirst({
        where: { name: { equals: trimmed, mode: 'insensitive' } },
      })
      if (existing) {
        if (!allInstrumentIds.includes(existing.id)) allInstrumentIds.push(existing.id)
      } else {
        const created = await prisma.instrument.create({ data: { name: trimmed } })
        allInstrumentIds.push(created.id)
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        siteRole: isFirstUser ? 'ADMIN' : 'USER',
        userPlan: isFirstUser ? 'CREATEUR' : (userPlan === 'CREATEUR' ? 'CREATEUR' : 'MUSICIEN'),
        emailVerified: isFirstUser ? new Date() : null,
        instruments: {
          create: allInstrumentIds.map((id: number) => ({ instrumentId: id })),
        },
      },
    })

    // Abonnement par défaut à la newsletter (désinscription possible depuis le profil ou le pied de page des mails)
    await prisma.newsletterSubscriber.upsert({
      where: { email: email.toLowerCase() },
      update: { active: true, unsubscribedAt: null, userId: user.id },
      create: { email: email.toLowerCase(), userId: user.id, token: crypto.randomUUID(), source: 'inscription', active: true },
    }).catch(() => {})

    if (!isFirstUser) {
      const token = crypto.randomBytes(32).toString('hex')
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
      const admin = await prisma.user.findFirst({ where: { siteRole: 'ADMIN' }, select: { email: true } })
      await Promise.all([
        sendEmailVerification(email, name, `${baseUrl}/verifier-email?token=${token}`),
        admin ? sendNewUserNotification(admin.email, { name, email }) : Promise.resolve(),
      ])
    }

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
  } catch (error) {
    console.error('Inscription error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
