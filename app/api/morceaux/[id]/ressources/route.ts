import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { detectResourceType } from '@/lib/utils'
import { coChefCanDo } from '@/lib/permissions'
import { getGroupStorageInfo, GB } from '@/lib/storage'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Disable Next.js body parsing for file uploads
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

  const resources = await prisma.resource.findMany({
    where: { songId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(resources)
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

  // Fetch group for storage check + permissions
  const group = await prisma.group.findUnique({
    where: { id: song.groupId },
    select: { plan: true, storageUsedBytes: true, createdBy: true, chefPermissions: true },
  })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  // Co-chef permission check
  if (!isAdmin && membership?.groupRole === 'CHEF') {
    if (!coChefCanDo(group, userId, isAdmin, 'ressources', 'create')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  // JSON body = URL resource (lien — ne consomme aucun stockage, toujours autorisé)
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const { url, name } = await req.json()
    if (!url?.trim()) return NextResponse.json({ error: 'L\'URL est requise.' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
    const resource = await prisma.resource.create({
      data: {
        songId,
        name: name.trim(),
        type: 'LIEN',
        filePath: url.trim(),
        uploadedById: userId,
      },
    })
    return NextResponse.json(resource, { status: 201 })
  }

  // ── Upload de fichier : règle unique = quota effectif > 0 ──────────────────
  const storageInfo = await getGroupStorageInfo(song.groupId)
  if (storageInfo.limitBytes <= 0) {
    return NextResponse.json({
      error: "L'ajout de fichiers n'est pas disponible avec ce plan (quota de stockage à 0). Passez à un plan avec stockage pour partager des partitions et ressources.",
      code: 'PLAN_FEATURE_LOCKED',
    }, { status: 403 })
  }

  try {
    const uploadDir = process.env.UPLOAD_DIR || './public/uploads'

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      filename: (name, ext) => `${Date.now()}-${name}${ext}`,
    })

    // Convert Next.js request to Node.js IncomingMessage format
    const contentType = req.headers.get('content-type') || ''
    const contentLength = req.headers.get('content-length') || '0'

    const arrayBuffer = await req.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { Readable } = require('stream')
    const stream = Readable.from(buffer)
    stream.headers = {
      'content-type': contentType,
      'content-length': contentLength,
    }

    const [fields, files] = await form.parse(stream as Parameters<typeof form.parse>[0])

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    if (!uploadedFile) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    }

    // Check storage quota — réutilise storageInfo calculé plus haut
    const fileSize = uploadedFile.size || 0
    if (storageInfo.usedBytes + fileSize > storageInfo.limitBytes) {
      fs.unlinkSync(uploadedFile.filepath) // clean up tmp file
      const label = storageInfo.hasOverride
        ? `Quota individuel du groupe : ${storageInfo.limitGb} Go`
        : storageInfo.groupCount > 1
          ? `Quota partagé entre vos ${storageInfo.groupCount} groupes : ${storageInfo.limitGb} Go au total`
          : `Quota de stockage : ${storageInfo.limitGb} Go`
      return NextResponse.json({
        error: `Quota de stockage dépassé. ${label}.`,
        code: 'STORAGE_QUOTA_EXCEEDED',
      }, { status: 413 })
    }

    const nameField = Array.isArray(fields.name) ? fields.name[0] : fields.name
    const typeField = Array.isArray(fields.type) ? fields.type[0] : fields.type

    const originalName = uploadedFile.originalFilename || 'fichier'
    const resourceType =
      typeField || detectResourceType(uploadedFile.mimetype || '', originalName)

    const filePath = uploadedFile.filepath
    const relativePath = filePath.startsWith('./public')
      ? filePath.replace('./public', '')
      : `/uploads/${path.basename(filePath)}`

    const [resource] = await prisma.$transaction([
      prisma.resource.create({
        data: {
          songId,
          name: nameField || originalName,
          type: resourceType as any,
          filePath: relativePath,
          fileSize: fileSize || null,
          uploadedById: userId,
        },
      }),
      prisma.group.update({
        where: { id: song.groupId },
        data: { storageUsedBytes: { increment: BigInt(fileSize) } },
      }),
    ])

    return NextResponse.json(resource, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erreur lors du téléversement.' }, { status: 500 })
  }
}
