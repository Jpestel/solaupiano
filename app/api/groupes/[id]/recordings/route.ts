import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isModuleEnabledForGroup } from '@/lib/module-access'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const MODULE_KEY = 'tool_voice_recorder'
const MAX_RECORDING_BYTES = 60 * 1024 * 1024

function extFromMime(mime: string) {
  const normalized = mime.toLowerCase()
  if (normalized.includes('ogg')) return '.ogg'
  if (normalized.includes('mp4') || normalized.includes('m4a')) return '.m4a'
  if (normalized.includes('wav')) return '.wav'
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return '.mp3'
  return '.webm'
}

function safeTitle(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'prise'
}

async function ensureAccess(groupId: number) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }) }

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!isAdmin && !membership) return { error: NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }) }

  if (!isAdmin && !(await isModuleEnabledForGroup(groupId, MODULE_KEY))) {
    return { error: NextResponse.json({ error: 'MODULE_LOCKED' }, { status: 403 }) }
  }

  return { session, userId, isAdmin }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const access = await ensureAccess(groupId)
  if (access.error) return access.error

  const songId = Number(req.nextUrl.searchParams.get('songId') || 0) || undefined
  const resourceId = Number(req.nextUrl.searchParams.get('resourceId') || 0) || undefined

  const recordings = await prisma.voiceRecording.findMany({
    where: {
      userId: access.userId,
      groupId,
      ...(songId ? { songId } : {}),
      ...(resourceId ? { resourceId } : {}),
    },
    include: {
      song: { select: { id: true, title: true, artist: true } },
      resource: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({ recordings })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id)
  const access = await ensureAccess(groupId)
  if (access.error) return access.error

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun fichier audio reçu.' }, { status: 400 })
  if (!file.type.startsWith('audio/') && !file.type.includes('webm')) {
    return NextResponse.json({ error: 'Format audio non supporté.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length <= 0) return NextResponse.json({ error: 'Enregistrement vide.' }, { status: 400 })
  if (buffer.length > MAX_RECORDING_BYTES) return NextResponse.json({ error: 'Enregistrement trop volumineux.' }, { status: 413 })

  const songId = Number(form.get('songId') || 0) || null
  const resourceId = Number(form.get('resourceId') || 0) || null
  const title = String(form.get('title') || '').trim().slice(0, 191) || 'Prise audio'
  const note = String(form.get('note') || '').trim().slice(0, 2000) || null
  const source = String(form.get('source') || 'GENERAL').trim().slice(0, 40) || 'GENERAL'
  const durationRaw = Number(form.get('durationSec') || 0)
  const durationSec = Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null

  if (songId) {
    const song = await prisma.song.findFirst({ where: { id: songId, groupId }, select: { id: true } })
    if (!song) return NextResponse.json({ error: 'Morceau introuvable dans ce groupe.' }, { status: 400 })
  }
  if (resourceId) {
    const resource = await prisma.resource.findFirst({ where: { id: resourceId, song: { groupId } }, select: { id: true } })
    if (!resource) return NextResponse.json({ error: 'Ressource introuvable dans ce groupe.' }, { status: 400 })
  }

  const uploadRoot = process.env.UPLOAD_DIR || './public/uploads'
  const uploadDir = path.join(uploadRoot, 'recordings')
  fs.mkdirSync(uploadDir, { recursive: true })

  const ext = extFromMime(file.type || file.name)
  const fileName = `${Date.now()}-${access.userId}-${safeTitle(title)}${ext}`
  const filePath = path.join(uploadDir, fileName)
  fs.writeFileSync(filePath, buffer)

  const relativePath = filePath.startsWith('./public')
    ? filePath.replace('./public', '')
    : filePath.includes('/public/')
      ? filePath.slice(filePath.indexOf('/public/') + '/public'.length)
      : `/uploads/recordings/${fileName}`

  const recording = await prisma.voiceRecording.create({
    data: {
      userId: access.userId,
      groupId,
      songId,
      resourceId,
      title,
      note,
      filePath: relativePath,
      mimeType: file.type || 'audio/webm',
      fileSize: buffer.length,
      durationSec,
      source,
    },
    include: {
      song: { select: { id: true, title: true, artist: true } },
      resource: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(recording, { status: 201 })
}
