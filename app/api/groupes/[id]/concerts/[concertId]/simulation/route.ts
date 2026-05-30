import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string; concertId: string } }

// GET — simulation liée à ce concert (si existe)
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const concertId = Number(params.concertId)

  const simulation = await prisma.cachetSimulation.findFirst({
    where: { concertId },
    select: { id: true, label: true, updatedAt: true, data: true },
  })

  return NextResponse.json({ simulation })
}

// PUT — lier une simulation existante à ce concert
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId    = Number(session.user.id)
  const concertId = Number(params.concertId)
  const { simulationId } = await req.json()

  if (simulationId === null) {
    // Délier
    await prisma.cachetSimulation.updateMany({
      where: { concertId },
      data:  { concertId: null },
    })
    return NextResponse.json({ ok: true })
  }

  // Vérifier que la simulation appartient bien à cet utilisateur
  const sim = await prisma.cachetSimulation.findUnique({ where: { id: simulationId } })
  if (!sim || sim.userId !== userId) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  // Délier l'ancienne simulation liée à ce concert (si une autre)
  await prisma.cachetSimulation.updateMany({
    where: { concertId },
    data:  { concertId: null },
  })

  // Lier la nouvelle
  await prisma.cachetSimulation.update({
    where: { id: simulationId },
    data:  { concertId },
  })

  return NextResponse.json({ ok: true })
}
