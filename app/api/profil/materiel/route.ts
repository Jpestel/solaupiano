import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GEAR_CATEGORIES } from '@/lib/gear'

export const dynamic = 'force-dynamic'

const VALID = new Set(GEAR_CATEGORIES.map(c => c.key))

// GET — matériel de l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const gear = await prisma.userGear.findMany({
    where: { userId: Number(session.user.id) },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  })
  return NextResponse.json(gear)
}

// PUT — remplace l'intégralité du matériel (sauvegarde groupée)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const { items } = await req.json()
  if (!Array.isArray(items)) return NextResponse.json({ error: 'Format invalide.' }, { status: 400 })
  if (items.length > 100) return NextResponse.json({ error: 'Trop d\'éléments (max 100).' }, { status: 400 })

  // Validation + normalisation
  const clean = items
    .filter((it: any) => it?.name?.trim())
    .map((it: any, i: number) => ({
      userId,
      category: VALID.has(it.category) ? it.category : 'OTHER',
      name: String(it.name).trim().slice(0, 120),
      brand: it.brand?.trim() ? String(it.brand).trim().slice(0, 80) : null,
      details: it.details?.trim() ? String(it.details).trim().slice(0, 500) : null,
      quantity: Math.max(1, Math.min(99, parseInt(it.quantity) || 1)),
      order: i,
    }))

  // Remplace l'ensemble
  await prisma.$transaction([
    prisma.userGear.deleteMany({ where: { userId } }),
    ...(clean.length > 0 ? [prisma.userGear.createMany({ data: clean })] : []),
  ])

  const gear = await prisma.userGear.findMany({
    where: { userId },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  })
  return NextResponse.json(gear)
}
