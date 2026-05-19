import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const users = await prisma.user.findMany({
    include: {
      instruments: { include: { instrument: true } },
      groups: {
        include: { group: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Don't return passwords
  return NextResponse.json(
    users.map(({ password, ...u }) => u)
  )
}
