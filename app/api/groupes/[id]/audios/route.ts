import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — tous les audios du groupe : séquences (backing tracks) + ressources audio des morceaux.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!isAdmin) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
    if (!m) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const [sequences, resources] = await Promise.all([
    prisma.songSequence.findMany({
      where: { kind: 'AUDIO', song: { groupId } },
      select: { id: true, title: true, filePath: true, song: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.resource.findMany({
      where: { type: 'AUDIO', song: { groupId } },
      select: { id: true, name: true, filePath: true, song: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const audios = [
    ...sequences.map((s) => ({ kind: 'sequence' as const, id: s.id, label: s.title, songTitle: s.song.title, filePath: s.filePath })),
    ...resources.map((r) => ({ kind: 'resource' as const, id: r.id, label: r.name, songTitle: r.song.title, filePath: r.filePath })),
  ]

  return NextResponse.json(audios)
}
