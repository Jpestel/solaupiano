import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

async function checkAccess(userId: number, groupId: number, isAdmin: boolean, chefOnly = false) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (isAdmin) return { ok: true, membership }
  if (!membership) return { ok: false, status: 403, error: 'Accès refusé.' }
  if (chefOnly && membership.groupRole !== 'CHEF') return { ok: false, status: 403, error: 'Réservé au chef du groupe.' }
  return { ok: true, membership }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const { ok, status, error } = await checkAccess(userId, groupId, isAdmin)
  if (!ok) return NextResponse.json({ error }, { status })

  const setlists = await prisma.setlist.findMany({
    where: { groupId },
    include: {
      _count: { select: { songs: true } },
      concerts: { select: { id: true, name: true, date: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(setlists)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const { ok, status, error } = await checkAccess(userId, groupId, isAdmin, true)
  if (!ok) return NextResponse.json({ error }, { status })

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'setlists', 'create')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const { name, description, showDuration } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  const setlist = await prisma.setlist.create({
    data: { groupId, name: name.trim(), description: description?.trim() || null, showDuration: !!showDuration },
  })

  return NextResponse.json(setlist, { status: 201 })
}
