import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Vérifie si l'utilisateur peut sauvegarder des simulations :
// - plan personnel avec stockage, OU
// - chef d'un groupe avec un plan incluant du stockage
async function canSaveSimulations(userId: number, userPlan: string): Promise<boolean> {
  // 1. Plan personnel
  const personalPlan = await prisma.plan.findUnique({
    where: { key: userPlan },
    select: { storageGb: true },
  })
  if (personalPlan && Number(personalPlan.storageGb) > 0) return true

  // 2. Chef (ou co-chef) d'un groupe avec plan payant incluant du stockage
  const chefMemberships = await prisma.groupMember.findMany({
    where:  { userId, groupRole: 'CHEF' },
    select: { group: { select: { plan: true } } },
  })
  if (chefMemberships.length === 0) return false

  const groupPlanKeys = [...new Set(chefMemberships.map(m => m.group.plan))]
  const groupPlans = await prisma.plan.findMany({
    where:  { key: { in: groupPlanKeys } },
    select: { key: true, storageGb: true },
  })
  return groupPlans.some(p => Number(p.storageGb) > 0)
}

// GET — liste des simulations + flag canSave
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId   = Number(session.user.id)
  const userPlan = session.user.userPlan ?? 'MUSICIEN'
  const isAdmin  = session.user.siteRole === 'ADMIN'

  const canSave = isAdmin || await canSaveSimulations(userId, userPlan)

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

  if (!isAdmin && !await canSaveSimulations(userId, userPlan)) {
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
