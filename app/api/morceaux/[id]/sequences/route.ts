import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'
import { getGroupStorageInfo } from '@/lib/storage'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

function detectKind(filename: string): 'AUDIO' | 'MIDI' {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext === 'mid' || ext === 'midi' ? 'MIDI' : 'AUDIO'
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const songId = Number(params.id)

  const song = await prisma.song.findUnique({ where: { id: songId } })
  if (!song) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: song.groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const sequences = await prisma.songSequence.findMany({
    where: { songId },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(sequences)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const songId = Number(params.id)

  const song = await prisma.song.findUnique({ where: { id: songId } })
  if (!song) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: song.groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const group = await prisma.group.findUnique({
    where: { id: song.groupId },
    select: { plan: true, createdBy: true, chefPermissions: true },
  })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  // Plan : le lecteur de séquences doit être inclus
  const plan = await prisma.plan.findUnique({ where: { key: group.plan }, select: { hasSequences: true } })
  if (!isAdmin && plan && plan.hasSequences === false) {
    return NextResponse.json({ error: "Le lecteur de séquences n'est pas inclus dans l'offre de ce groupe.", code: 'PLAN_FEATURE_LOCKED' }, { status: 403 })
  }

  // Permission co-chef (réutilise le module "ressources")
  if (!isAdmin && membership?.groupRole === 'CHEF') {
    if (!coChefCanDo(group, userId, isAdmin, 'ressources', 'create')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }
  // Les simples membres ne peuvent pas ajouter (réservé chef / admin)
  if (!isAdmin && membership?.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  // Upload : quota effectif > 0
  const storageInfo = await getGroupStorageInfo(song.groupId)
  if (storageInfo.limitBytes <= 0) {
    return NextResponse.json({
      error: "L'ajout de fichiers n'est pas disponible avec ce plan (quota de stockage à 0).",
      code: 'PLAN_FEATURE_LOCKED',
    }, { status: 403 })
  }

  try {
    const uploadDir = process.env.UPLOAD_DIR || './public/uploads'
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024,
      filename: (name, ext) => `${Date.now()}-${name}${ext}`,
    })

    const contentType = req.headers.get('content-type') || ''
    const contentLength = req.headers.get('content-length') || '0'
    const arrayBuffer = await req.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const { Readable } = require('stream')
    const stream = Readable.from(buffer)
    stream.headers = { 'content-type': contentType, 'content-length': contentLength }

    const [fields, files] = await form.parse(stream as Parameters<typeof form.parse>[0])
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    if (!uploadedFile) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })

    const fileSize = uploadedFile.size || 0
    if (storageInfo.usedBytes + fileSize > storageInfo.limitBytes) {
      fs.unlinkSync(uploadedFile.filepath)
      return NextResponse.json({ error: `Quota de stockage dépassé (${storageInfo.limitGb} Go).`, code: 'STORAGE_QUOTA_EXCEEDED' }, { status: 413 })
    }

    const originalName = uploadedFile.originalFilename || 'séquence'
    const kind = detectKind(originalName)

    const titleField = Array.isArray(fields.title) ? fields.title[0] : fields.title
    const channelField = Array.isArray(fields.channelMode) ? fields.channelMode[0] : fields.channelMode
    const channelMode = channelField === 'SPLIT_LR' ? 'SPLIT_LR' : 'STEREO'

    const filePath = uploadedFile.filepath
    const relativePath = filePath.startsWith('./public')
      ? filePath.replace('./public', '')
      : `/uploads/${path.basename(filePath)}`

    const count = await prisma.songSequence.count({ where: { songId } })

    const [sequence] = await prisma.$transaction([
      prisma.songSequence.create({
        data: {
          songId,
          kind: kind as any,
          title: (titleField || originalName).slice(0, 191),
          filePath: relativePath,
          fileSize,
          channelMode: channelMode as any,
          order: count,
          createdById: userId,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
      prisma.group.update({
        where: { id: song.groupId },
        data: { storageUsedBytes: { increment: BigInt(fileSize) } },
      }),
    ])

    return NextResponse.json(sequence, { status: 201 })
  } catch (error) {
    console.error('Sequence upload error:', error)
    return NextResponse.json({ error: 'Erreur lors du téléversement.' }, { status: 500 })
  }
}
