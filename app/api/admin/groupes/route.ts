import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const groups = await prisma.group.findMany({
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { members: true, rehearsals: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(groups)
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
