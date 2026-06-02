import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [groups, plans] = await Promise.all([
    prisma.group.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { members: true, rehearsals: true, concerts: true, songs: true, setlists: true, chordCharts: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.plan.findMany({ select: { key: true, maxMembersPerGroup: true } }),
  ])

  // Build a map of plan key → maxMembersPerGroup
  const planMaxMap: Record<string, number | null> = {}
  for (const p of plans) planMaxMap[p.key] = p.maxMembersPerGroup ?? null

  // BigInt cannot be JSON-serialised — convert to string
  const serializable = groups.map((g) => ({
    ...g,
    storageUsedBytes: String(g.storageUsedBytes),
    planMaxMembersPerGroup: planMaxMap[g.plan] ?? null,
  }))

  return NextResponse.json(serializable)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { name, description, chefId, isPublic } = await req.json()

  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
  if (!chefId) return NextResponse.json({ error: 'Un chef est requis.' }, { status: 400 })

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
      members: {
        create: { userId: Number(chefId), groupRole: 'CHEF' },
      },
    },
  })

  return NextResponse.json(group, { status: 201 })
}
