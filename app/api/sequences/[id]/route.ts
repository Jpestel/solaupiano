import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { getGroupStorageInfo } from '@/lib/storage'
import fs from 'fs'
import path from 'path'

const MAX_SEQUENCE_UPLOAD_BYTES = 1024 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mid', 'midi'])

function diskPathFor(filePath: string) {
  return filePath.startsWith('/')
    ? path.join(process.cwd(), 'public', filePath)
    : path.join(process.cwd(), filePath)
}

async function getSequenceAccess(seqId: number, userId: number, isAdmin: boolean) {
  const seq = await prisma.songSequence.findUnique({ where: { id: seqId }, include: { song: true } })
  if (!seq) return { seq: null, isChef: false }
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: seq.song.groupId } },
  })
  return { seq, isChef: membership?.groupRole === 'CHEF' || isAdmin }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const seqId = Number(params.id)

  const { seq, isChef } = await getSequenceAccess(seqId, userId, isAdmin)
  if (!seq) return NextResponse.json({ error: 'Séquence introuvable.' }, { status: 404 })
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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const seqId = Number(params.id)
  const { seq, isChef } = await getSequenceAccess(seqId, userId, isAdmin)
  if (!seq) return NextResponse.json({ error: 'Séquence introuvable.' }, { status: 404 })
  if (!isAdmin && !isChef) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  if (!isAdmin) {
    const group = await prisma.group.findUnique({
      where: { id: seq.song.groupId },
      select: { createdBy: true, chefPermissions: true },
    })
    if (group && !coChefCanDo(group, userId, false, 'ressources', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  }
  if (file.size > MAX_SEQUENCE_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux.' }, { status: 413 })
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: 'Format non supporté. Importez un MP3, WAV, OGG, M4A, AAC, FLAC, MID ou MIDI.' }, { status: 400 })
  }

  const storage = await getGroupStorageInfo(seq.song.groupId)
  const oldSize = Number(seq.fileSize || 0)
  const projectedUsage = Math.max(0, storage.usedBytes - oldSize) + file.size
  if (storage.limitBytes <= 0 || projectedUsage > storage.limitBytes) {
    return NextResponse.json({ error: `Quota de stockage dépassé (${storage.limitGb} Go).`, code: 'STORAGE_QUOTA_EXCEEDED' }, { status: 413 })
  }

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './public/uploads')
  fs.mkdirSync(uploadDir, { recursive: true })
  const filename = `${Date.now()}-seq.${extension}`
  const newDiskPath = path.join(uploadDir, filename)
  const newFilePath = `/uploads/${filename}`

  try {
    fs.writeFileSync(newDiskPath, Buffer.from(await file.arrayBuffer()))
    const kind = extension === 'mid' || extension === 'midi' ? 'MIDI' : 'AUDIO'
    const title = String(form.get('title') || seq.title).trim().slice(0, 191) || seq.title
    const channelMode = form.get('channelMode') === 'SPLIT_LR' ? 'SPLIT_LR' : 'STEREO'
    const sizeDelta = file.size - oldSize

    const [updated] = await prisma.$transaction([
      prisma.songSequence.update({
        where: { id: seqId },
        data: { title, channelMode, kind, filePath: newFilePath, fileSize: file.size },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.$executeRaw`UPDATE \`Group\` SET storageUsedBytes = GREATEST(0, storageUsedBytes + ${sizeDelta}) WHERE id = ${seq.song.groupId}` as any,
    ])

    try {
      const oldDiskPath = diskPathFor(seq.filePath)
      if (fs.existsSync(oldDiskPath)) fs.unlinkSync(oldDiskPath)
    } catch (error) { console.error('Error deleting replaced sequence file:', error) }
    return NextResponse.json(updated)
  } catch (error) {
    try { if (fs.existsSync(newDiskPath)) fs.unlinkSync(newDiskPath) } catch { /* ignore */ }
    console.error('Sequence replacement error:', error)
    return NextResponse.json({ error: 'Erreur lors du remplacement du fichier.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const seqId = Number(params.id)

  const { seq, isChef } = await getSequenceAccess(seqId, userId, isAdmin)
  if (!seq) return NextResponse.json({ error: 'Séquence introuvable.' }, { status: 404 })
  if (!isAdmin && !isChef) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: seq.song.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, false, 'ressources', 'delete')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const ops: any[] = [
    prisma.songSequence.delete({ where: { id: seqId } }),
  ]
  if (seq.fileSize && seq.fileSize > 0) {
    ops.push(
      prisma.$executeRaw`UPDATE \`Group\` SET storageUsedBytes = GREATEST(0, storageUsedBytes - ${seq.fileSize}) WHERE id = ${seq.song.groupId}` as any
    )
  }
  await prisma.$transaction(ops)

  // La base est la source de vérité : le fichier n'est retiré qu'après une transaction réussie.
  const diskPath = diskPathFor(seq.filePath)
  try { if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath) } catch (err) { console.error('Error deleting sequence file:', err) }

  return NextResponse.json({ success: true })
}
