import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

async function requireChef(session: Awaited<ReturnType<typeof getServerSession>>, groupId: number) {
  if (!session) return false
  if (session.user.siteRole === 'ADMIN') return true
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId } },
  })
  return membership?.groupRole === 'CHEF'
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; songId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const songId = Number(params.songId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!await requireChef(session, groupId)) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, Number(session.user.id), isAdmin, 'repertoire', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const { title, artist, notes, durationSeconds, tempo } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const song = await prisma.song.update({
    where: { id: songId },
    data: {
      title: title.trim(),
      artist: artist?.trim() || null,
      notes: notes?.trim() || null,
      durationSeconds: durationSeconds != null ? Number(durationSeconds) : null,
      tempo: tempo != null && tempo !== '' ? Math.max(20, Math.min(300, Number(tempo))) : null,
    },
  })

  return NextResponse.json(song)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; songId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const songId = Number(params.songId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!await requireChef(session, groupId)) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, Number(session.user.id), isAdmin, 'repertoire', 'delete')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  await prisma.song.delete({ where: { id: songId } })

  return NextResponse.json({ ok: true })
}
