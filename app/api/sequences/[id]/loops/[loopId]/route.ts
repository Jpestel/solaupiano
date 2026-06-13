import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// DELETE — supprime une boucle (uniquement la sienne)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; loopId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const loopId = Number(params.loopId)

  const loop = await prisma.sequenceLoop.findUnique({ where: { id: loopId }, select: { userId: true, sequenceId: true } })
  if (!loop) return NextResponse.json({ error: 'Boucle introuvable.' }, { status: 404 })
  if (loop.userId !== userId && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Vous ne pouvez supprimer que vos propres boucles.' }, { status: 403 })
  }
  if (loop.sequenceId !== Number(params.id)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  await prisma.sequenceLoop.delete({ where: { id: loopId } })
  return NextResponse.json({ ok: true })
}
