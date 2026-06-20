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

const MAX_SEQUENCE_UPLOAD_BYTES = 1024 * 1024 * 1024
const ALLOWED_AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'])
const ALLOWED_MIDI_EXTENSIONS = new Set(['mid', 'midi'])
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  'audio/midi',
  'audio/x-midi',
  'application/octet-stream',
])

function detectKind(filename: string): 'AUDIO' | 'MIDI' {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext === 'mid' || ext === 'midi' ? 'MIDI' : 'AUDIO'
}

function validateSequenceFile(filename: string, mimeType?: string | null) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mime = (mimeType || '').toLowerCase()
  const knownExtension = ALLOWED_AUDIO_EXTENSIONS.has(ext) || ALLOWED_MIDI_EXTENSIONS.has(ext)
  const knownMime = mime.startsWith('audio/') || ALLOWED_MIME_TYPES.has(mime)

  if (!knownExtension && !knownMime) {
    return 'Format non supporté. Importez un MP3, WAV, OGG, M4A, AAC, FLAC, MID ou MIDI.'
  }
  if (mime === 'application/octet-stream' && !knownExtension) {
    return 'Format non reconnu. Sur téléphone, vérifiez que le fichier porte bien une extension audio comme .mp3.'
  }
  return null
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
    const remainingBytes = Math.max(0, storageInfo.limitBytes - storageInfo.usedBytes)
    const maxFileSize = Math.min(Math.max(remainingBytes, 1), MAX_SEQUENCE_UPLOAD_BYTES)

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize,
      // Nom de fichier ASCII sans espaces (URL fiable) — le titre lisible est stocké en base
      filename: (name, ext) => `${Date.now()}-seq${(ext || '').toLowerCase()}`,
    })

    const contentType = req.headers.get('content-type') || ''
    const contentLength = req.headers.get('content-length') || '0'
    const declaredBytes = Number(contentLength || 0)
    if (declaredBytes > storageInfo.limitBytes - storageInfo.usedBytes) {
      return NextResponse.json({ error: `Quota de stockage dépassé (${storageInfo.limitGb} Go).`, code: 'STORAGE_QUOTA_EXCEEDED' }, { status: 413 })
    }

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
    const validationError = validateSequenceFile(originalName, uploadedFile.mimetype)
    if (validationError) {
      fs.unlinkSync(uploadedFile.filepath)
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

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
    const message = error instanceof Error && /maxFileSize|maxTotalFileSize|options\.max/i.test(error.message)
      ? 'Fichier trop volumineux pour le quota disponible du groupe.'
      : 'Erreur lors du téléversement.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
