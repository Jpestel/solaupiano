import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/bulles/[id]/dismissals — (admin) liste des utilisateurs ayant masqué cette bulle.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const bubbleId = Number(params.id)
  const rows = await prisma.helpBubbleDismissal.findMany({
    where: { bubbleId },
    orderBy: { createdAt: 'desc' },
    select: { userId: true, createdAt: true, user: { select: { name: true, email: true } } },
  })
  return NextResponse.json(rows.map((r) => ({ userId: r.userId, name: r.user.name, email: r.user.email, createdAt: r.createdAt })))
}

// DELETE /api/bulles/[id]/dismissals — (admin) ré-affiche la bulle.
//   body { userId }     → ré-affiche pour cet utilisateur
//   body { all: true }  → ré-affiche pour tout le monde
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const bubbleId = Number(params.id)
  const b = await req.json().catch(() => ({}))

  if (b.all === true) {
    const r = await prisma.helpBubbleDismissal.deleteMany({ where: { bubbleId } })
    return NextResponse.json({ removed: r.count })
  }
  const userId = Number(b.userId)
  if (!Number.isInteger(userId)) return NextResponse.json({ error: 'userId manquant.' }, { status: 400 })
  await prisma.helpBubbleDismissal.deleteMany({ where: { bubbleId, userId } })
  return NextResponse.json({ removed: 1 })
}
