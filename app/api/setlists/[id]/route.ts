import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

async function getSetlistAndCheckAccess(setlistId: number, userId: number, isAdmin: boolean, chefOnly = false) {
  const setlist = await prisma.setlist.findUnique({
    where: { id: setlistId },
    include: {
      songs: {
        include: {
          song: {
            include: {
              resources: { orderBy: { createdAt: 'asc' } },
              chordCharts: { select: { id: true, title: true }, orderBy: { createdAt: 'asc' } },
              squareScores: { select: { id: true, title: true }, orderBy: { createdAt: 'asc' } },
              lyrics: { select: { id: true } },
              tab: { select: { id: true } },
              _count: { select: { sequences: true } },
            },
          },
        },
        orderBy: [{ position: 'asc' }, { songId: 'asc' }],
      },
      concerts: { select: { id: true, name: true, date: true } },
    },
  })
  if (!setlist) return { ok: false, status: 404, error: 'Setlist introuvable.' }

  if (!isAdmin) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: setlist.groupId } },
    })
    if (!membership) return { ok: false, status: 403, error: 'Accès refusé.' }
    if (chefOnly && membership.groupRole !== 'CHEF') return { ok: false, status: 403, error: 'Réservé au chef.' }
  }

  return { ok: true, setlist }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const setlistId = Number(params.id)

  const result = await getSetlistAndCheckAccess(setlistId, userId, isAdmin)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json(result.setlist)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const setlistId = Number(params.id)

  const result = await getSetlistAndCheckAccess(setlistId, userId, isAdmin, true)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: result.setlist!.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'setlists', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const { name, description, showDuration } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  const updated = await prisma.setlist.update({
    where: { id: setlistId },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ...(showDuration !== undefined ? { showDuration: !!showDuration } : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const setlistId = Number(params.id)

  const result = await getSetlistAndCheckAccess(setlistId, userId, isAdmin, true)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: result.setlist!.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'setlists', 'delete')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  await prisma.setlist.delete({ where: { id: setlistId } })

  return NextResponse.json({ ok: true })
}
