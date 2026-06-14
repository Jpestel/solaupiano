import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — (admin) utilisateurs ayant désactivé TOUTES les bulles (préférence globale du profil).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const users = await prisma.user.findMany({
    where: { helpBubblesOptOut: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

// DELETE — (admin) réactive les bulles pour un utilisateur (remet sa préférence à "afficher").
//   body { userId }  → un utilisateur
//   body { all: true } → tout le monde
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (b.all === true) {
    const r = await prisma.user.updateMany({ where: { helpBubblesOptOut: true }, data: { helpBubblesOptOut: false } })
    return NextResponse.json({ reactivated: r.count })
  }
  const userId = Number(b.userId)
  if (!Number.isInteger(userId)) return NextResponse.json({ error: 'userId manquant.' }, { status: 400 })
  await prisma.user.update({ where: { id: userId }, data: { helpBubblesOptOut: false } })
  return NextResponse.json({ reactivated: 1 })
}
