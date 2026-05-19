import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, instrumentIds, otherInstrument } = body

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
        instruments: {
          create: allInstrumentIds.map((id: number) => ({ instrumentId: id })),
        },
      },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
  } catch (error) {
    console.error('Inscription error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
