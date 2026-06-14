import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/bulles/users?q=...   → recherche d'utilisateurs (nom/email) pour le ciblage
// GET /api/bulles/users?ids=1,2 → résolution des utilisateurs déjà ciblés (noms)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const { searchParams } = new URL(req.url)

  const idsParam = searchParams.get('ids')
  if (idsParam) {
    const ids = idsParam.split(',').map((x) => Number(x)).filter((n) => Number.isInteger(n))
    if (ids.length === 0) return NextResponse.json([])
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    return NextResponse.json(users)
  }

  const q = (searchParams.get('q') || '').trim()
  if (q.length < 1) return NextResponse.json([])
  const users = await prisma.user.findMany({
    where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
    take: 12,
  })
  return NextResponse.json(users)
}
