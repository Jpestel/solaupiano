import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH — renommer une simulation
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const id     = Number(params.id)

  const sim = await prisma.cachetSimulation.findUnique({ where: { id } })
  if (!sim || sim.userId !== userId) return NextResponse.json({ error: 'Non trouvé.' }, { status: 404 })

  const { label, concertId } = await req.json()

  const updated = await prisma.cachetSimulation.update({
    where: { id },
    data: {
      ...(label?.trim() ? { label: label.trim() } : {}),
      ...(concertId !== undefined ? { concertId: concertId ?? null } : {}),
    },
    select: {
      id: true, label: true, updatedAt: true, concertId: true,
      concert: { select: { id: true, name: true, date: true, groupId: true } },
    },
  })
  return NextResponse.json(updated)
}

// DELETE — supprimer une simulation
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const id     = Number(params.id)

  const sim = await prisma.cachetSimulation.findUnique({ where: { id } })
  if (!sim || sim.userId !== userId) return NextResponse.json({ error: 'Non trouvé.' }, { status: 404 })

  await prisma.cachetSimulation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
