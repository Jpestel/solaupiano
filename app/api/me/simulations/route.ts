import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Vérifie si le plan de l'utilisateur inclut du stockage
async function canSaveSimulations(userPlan: string): Promise<boolean> {
  if (userPlan === 'ADMIN') return true // admins toujours autorisés
  const plan = await prisma.plan.findUnique({
    where: { key: userPlan },
    select: { storageGb: true },
  })
  // storageGb peut être un Decimal Prisma — on le convertit
  return plan !== null && Number(plan.storageGb) > 0
}

// GET — liste des simulations + flag canSave
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId   = Number(session.user.id)
  const userPlan = session.user.userPlan ?? 'MUSICIEN'
  const isAdmin  = session.user.siteRole === 'ADMIN'

  const canSave = isAdmin || await canSaveSimulations(userPlan)

  const simulations = canSave
    ? await prisma.cachetSimulation.findMany({
        where:   { userId },
        orderBy: { updatedAt: 'desc' },
        select:  {
          id: true, label: true, createdAt: true, updatedAt: true, data: true,
          concertId: true,
          concert: { select: { id: true, name: true, date: true, groupId: true } },
        },
      })
    : []

  return NextResponse.json({ canSave, simulations })
}

// POST — créer ou mettre à jour une simulation (upsert par label si même label)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId   = Number(session.user.id)
  const userPlan = session.user.userPlan ?? 'MUSICIEN'
  const isAdmin  = session.user.siteRole === 'ADMIN'

  if (!isAdmin && !await canSaveSimulations(userPlan)) {
    return NextResponse.json({ error: 'Votre forfait ne permet pas de sauvegarder des simulations.' }, { status: 403 })
  }

  const { label, data, concertId } = await req.json()
  if (!label?.trim()) return NextResponse.json({ error: 'Un nom est requis.' }, { status: 400 })
  if (!data)          return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })

  // Limite : 50 simulations par utilisateur
  const count = await prisma.cachetSimulation.count({ where: { userId } })
  if (count >= 50) return NextResponse.json({ error: 'Limite de 50 simulations atteinte.' }, { status: 400 })

  const simulation = await prisma.cachetSimulation.create({
    data: { userId, label: label.trim(), data, concertId: concertId ?? null },
    select: {
      id: true, label: true, createdAt: true, updatedAt: true, data: true,
      concertId: true,
      concert: { select: { id: true, name: true, date: true, groupId: true } },
    },
  })

  return NextResponse.json(simulation, { status: 201 })
}
