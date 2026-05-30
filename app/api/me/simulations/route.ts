import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEstimationAccess } from '@/lib/estimation-access'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET — liste des simulations + droits détaillés
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId   = Number(session.user.id)
  const userPlan = session.user.userPlan ?? 'MUSICIEN'
  const isAdmin  = session.user.siteRole === 'ADMIN'

  const access = await getEstimationAccess(userId, userPlan, isAdmin)

  const simulations = access.storage
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

  // canSave conservé pour compat : droit de créer une estimation
  return NextResponse.json({ canSave: access.create, access, simulations })
}

// POST — créer une nouvelle simulation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId   = Number(session.user.id)
  const userPlan = session.user.userPlan ?? 'MUSICIEN'
  const isAdmin  = session.user.siteRole === 'ADMIN'

  const access = await getEstimationAccess(userId, userPlan, isAdmin)
  if (!access.storage) {
    return NextResponse.json({ error: 'Votre forfait ne permet pas de sauvegarder des simulations.' }, { status: 403 })
  }
  if (!access.create) {
    return NextResponse.json({ error: "Le fondateur ne vous autorise pas à créer des estimations." }, { status: 403 })
  }

  const { label, data, concertId } = await req.json()
  if (!label?.trim()) return NextResponse.json({ error: 'Un nom est requis.' }, { status: 400 })
  if (!data)          return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })

  // Lien à un concert → nécessite la permission "save" pour le groupe du concert
  let finalConcertId: number | null = null
  if (concertId) {
    const concert = await prisma.concert.findUnique({
      where:  { id: Number(concertId) },
      select: { groupId: true, group: { select: { createdBy: true, chefPermissions: true } } },
    })
    if (concert) {
      if (!coChefCanDo(concert.group, userId, isAdmin, 'estimations', 'save')) {
        return NextResponse.json({ error: "Le fondateur ne vous autorise pas à lier une estimation à un concert." }, { status: 403 })
      }
      finalConcertId = Number(concertId)
    }
  }

  // Limite : 50 simulations par utilisateur
  const count = await prisma.cachetSimulation.count({ where: { userId } })
  if (count >= 50) return NextResponse.json({ error: 'Limite de 50 simulations atteinte.' }, { status: 400 })

  const simulation = await prisma.cachetSimulation.create({
    data: { userId, label: label.trim(), data, concertId: finalConcertId },
    select: {
      id: true, label: true, createdAt: true, updatedAt: true, data: true,
      concertId: true,
      concert: { select: { id: true, name: true, date: true, groupId: true } },
    },
  })

  return NextResponse.json(simulation, { status: 201 })
}
