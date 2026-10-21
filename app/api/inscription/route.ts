import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmailVerification, sendNewUserNotification } from '@/lib/email'
import { accessTokenMatches } from '@/lib/acces'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, instrumentIds, otherInstrument, inviteToken, acces } = body

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

    /* ─── Accès sur invitation ───
       L'inscription n'est pas ouverte au public : il faut soit le lien
       d'invitation d'un groupe, soit une invitation personnelle de l'éditeur.
       Ce contrôle est ici, et pas seulement dans l'écran d'inscription, parce
       que c'est le seul endroit qu'on ne peut pas contourner. */
    let invitedByGroupId: number | null = null
    if (!isFirstUser) {
      if (inviteToken) {
        const group = await prisma.group.findUnique({
          where: { inviteToken: String(inviteToken) },
          select: { id: true, archivedAt: true },
        })
        if (group && !group.archivedAt) invitedByGroupId = group.id
      }
      const parAcces = typeof acces === 'string' && accessTokenMatches(acces, email)

      if (invitedByGroupId === null && !parAcces) {
        return NextResponse.json({
          error: "L'inscription à Sol au piano se fait uniquement sur invitation. "
            + "Si un chef d'orchestre ou un professeur vous a invité, utilisez le lien reçu par email. "
            + 'Sinon, demandez un accès à l\'éditeur.',
          code: 'INVITATION_REQUISE',
        }, { status: 403 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Resolve "other" instrument — reuse existing or create new
    const allInstrumentIds: number[] = Array.isArray(instrumentIds) ? [...instrumentIds] : []
    if (otherInstrument?.trim()) {
      const trimmed = otherInstrument.trim()
      // NB : MySQL compare déjà sans tenir compte de la casse (collation _ci) ;
      // `mode: 'insensitive'` n'existe pas en MySQL et ferait planter la requête.
      const existing = await prisma.instrument.findFirst({
        where: { name: { equals: trimmed } },
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
        // Tout compte est un musicien complet : il peut rejoindre ET créer/gérer
        // un groupe ou une classe (dans la limite de son plan). Plus de choix à l'inscription.
        userPlan: 'CREATEUR',
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
      // Non bloquant : un échec d'envoi d'email ne doit pas faire échouer l'inscription.
      await Promise.all([
        sendEmailVerification(email, name, `${baseUrl}/verifier-email?token=${token}`),
        admin ? sendNewUserNotification(admin.email, { name, email }) : Promise.resolve(),
      ]).catch((e) => console.error('Envoi emails inscription échoué:', e))
    }

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
  } catch (error) {
    console.error('Inscription error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
