import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import fs from 'fs'
import path from 'path'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const seqId = Number(params.id)

  const seq = await prisma.songSequence.findUnique({ where: { id: seqId }, include: { song: true } })
  if (!seq) return NextResponse.json({ error: 'Séquence introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: seq.song.groupId } },
  })
  const isChef = membership?.groupRole === 'CHEF'
  if (!isAdmin && !isChef) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  if (!isAdmin && isChef) {
    const grp = await prisma.group.findUnique({ where: { id: seq.song.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'ressources', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const { title, channelMode } = await req.json()
  const data: { title?: string; channelMode?: any } = {}
  if (typeof title === 'string' && title.trim()) data.title = title.trim().slice(0, 191)
  if (channelMode === 'STEREO' || channelMode === 'SPLIT_LR') data.channelMode = channelMode

  const updated = await prisma.songSequence.update({ where: { id: seqId }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const seqId = Number(params.id)

  const seq = await prisma.songSequence.findUnique({ where: { id: seqId }, include: { song: true } })
  if (!seq) return NextResponse.json({ error: 'Séquence introuvable.' }, { status: 404 })

  const isOwner = seq.createdById === userId
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: seq.song.groupId } },
  })
  const isChef = membership?.groupRole === 'CHEF'
  if (!isAdmin && !isChef && !isOwner) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  if (!isAdmin && isChef && !isOwner) {
    const grp = await prisma.group.findUnique({ where: { id: seq.song.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, false, 'ressources', 'delete')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  // Supprime le fichier du disque
  const diskPath = seq.filePath.startsWith('/')
    ? path.join(process.cwd(), 'public', seq.filePath)
    : path.join(process.cwd(), seq.filePath)
  try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath) } catch (err) { console.error('Error deleting sequence file:', err) }

  const ops: any[] = [
    prisma.songSequence.delete({ where: { id: seqId } }),
  ]
  if (seq.fileSize && seq.fileSize > 0) {
    ops.push(
      prisma.$executeRaw`UPDATE \`Group\` SET storageUsedBytes = GREATEST(0, storageUsedBytes - ${seq.fileSize}) WHERE id = ${seq.song.groupId}` as any
    )
  }
  await prisma.$transaction(ops)

  return NextResponse.json({ success: true })
}
