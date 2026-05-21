import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: { select: { members: true, rehearsals: true, songs: true } },
        },
      },
    },
  })

  return NextResponse.json(memberships)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const body = await req.json()
  const { name, description, chefId, isPublic, isHidden, lookingFor } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  const isAdmin = session.user.siteRole === 'ADMIN'

  // Musiciens (non-créateurs) cannot create groups
  if (!isAdmin && session.user.userPlan !== 'CREATEUR') {
    return NextResponse.json(
      { error: 'Votre plan Musicien ne permet pas de créer un groupe. Passez au plan Créateur depuis votre profil.' },
      { status: 403 }
    )
  }

  // Admin can designate a chef; a musician becomes CHEF of their own group
  const chefUserId = isAdmin && chefId ? Number(chefId) : (!isAdmin ? Number(session.user.id) : null)

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || undefined,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
      isHidden: typeof isHidden === 'boolean' ? isHidden : false,
      lookingFor: lookingFor ?? null,
      lookingForSince: lookingFor ? new Date() : null,
      ...(chefUserId && {
        members: {
          create: { userId: chefUserId, groupRole: 'CHEF' },
        },
      }),
    },
  })

  return NextResponse.json({ ...group, storageUsedBytes: String(group.storageUsedBytes) }, { status: 201 })
}
