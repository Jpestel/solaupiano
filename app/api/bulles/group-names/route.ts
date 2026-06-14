import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — (admin) id → nom de chaque groupe, pour afficher des libellés lisibles.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const groups = await prisma.group.findMany({ select: { id: true, name: true } })
  return NextResponse.json(Object.fromEntries(groups.map((g) => [g.id, g.name])))
}
