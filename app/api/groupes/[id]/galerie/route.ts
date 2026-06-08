import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupStorageInfo } from '@/lib/storage'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

async function access(userId: number, groupId: number, isAdmin: boolean) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true } })
  if (!group) return null
  if (isAdmin) return { isMember: true, isChef: true }
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!m) return null
  const isChef = group.createdBy === userId || m.groupRole === 'CHEF'
  return { isMember: true, isChef }
}

const fmtDate = (d: Date) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)

// GET — photos du groupe + événements récents (pour l'organisation en albums)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const acc = await access(userId, groupId, isAdmin)
  if (!acc) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [photos, rehearsals, concerts, categories, storage] = await Promise.all([
    prisma.galleryPhoto.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, filePath: true, fileSize: true, caption: true,
        eventType: true, eventId: true, eventLabel: true, createdAt: true,
        uploaderId: true, uploader: { select: { id: true, name: true } },
      },
    }),
    prisma.rehearsal.findMany({ where: { groupId }, orderBy: { date: 'desc' }, take: 60, select: { id: true, date: true, location: true } }),
    prisma.concert.findMany({ where: { groupId }, orderBy: { date: 'desc' }, take: 60, select: { id: true, date: true, name: true } }),
    prisma.galleryCategory.findMany({ where: { groupId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getGroupStorageInfo(groupId),
  ])

  // Événements triés du plus proche (de maintenant) au plus lointain
  const nowMs = Date.now()
  const events = [
    ...concerts.map((c) => ({ type: 'CONCERT' as const, id: c.id, date: c.date, label: `🎭 ${c.name} — ${fmtDate(c.date)}` })),
    ...rehearsals.map((r) => ({ type: 'REHEARSAL' as const, id: r.id, date: r.date, label: `🎵 Répétition du ${fmtDate(r.date)}${r.location ? ` (${r.location})` : ''}` })),
  ].sort((a, b) => Math.abs(a.date.getTime() - nowMs) - Math.abs(b.date.getTime() - nowMs))

  return NextResponse.json({
    photos: photos.map((p) => ({ ...p, mine: p.uploaderId === userId })),
    events,
    categories,
    isChef: acc.isChef,
    storage: { usedBytes: storage.usedBytes, limitBytes: storage.limitBytes, limitGb: storage.limitGb, percent: storage.percent },
  })
}

// POST — upload d'une photo (multipart, déjà compressée côté client)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const acc = await access(userId, groupId, isAdmin)
  if (!acc) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Format invalide.' }, { status: 400 })
  }

  const storageInfo = await getGroupStorageInfo(groupId)
  if (storageInfo.limitBytes <= 0) {
    return NextResponse.json({ error: "Le stockage n'est pas disponible avec ce plan (quota à 0).", code: 'PLAN_FEATURE_LOCKED' }, { status: 403 })
  }

  const uploadDir = './public/uploads/galerie'
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  const form = formidable({
    uploadDir, keepExtensions: true, maxFileSize: 8 * 1024 * 1024,
    filename: (_n, ext) => `${groupId}-${Date.now()}-${userId}-${Math.random().toString(36).slice(2, 8)}${ext || '.jpg'}`,
  })

  const arrayBuffer = await req.arrayBuffer()
  const { Readable } = require('stream')
  const stream = Readable.from(Buffer.from(arrayBuffer))
  stream.headers = { 'content-type': contentType, 'content-length': req.headers.get('content-length') || '0' }
  const [fields, files] = await form.parse(stream as Parameters<typeof form.parse>[0])

  const file = Array.isArray(files.file) ? files.file[0] : files.file
  if (!file) return NextResponse.json({ error: 'Aucune photo reçue.' }, { status: 400 })

  // Validation type image
  if (file.mimetype && !file.mimetype.startsWith('image/')) {
    fs.unlinkSync(file.filepath)
    return NextResponse.json({ error: 'Seules les images sont acceptées.' }, { status: 400 })
  }
  const fileSize = file.size || 0
  if (storageInfo.usedBytes + fileSize > storageInfo.limitBytes) {
    fs.unlinkSync(file.filepath)
    return NextResponse.json({ error: `Quota de stockage dépassé (limite : ${storageInfo.limitGb} Go).`, code: 'STORAGE_QUOTA_EXCEEDED' }, { status: 413 })
  }

  const fv = (k: string) => { const v = fields[k]; return (Array.isArray(v) ? v[0] : v)?.trim() || null }
  const caption = fv('caption')?.slice(0, 500) || null
  const eventTypeRaw = fv('eventType')
  const eventType = eventTypeRaw === 'REHEARSAL' || eventTypeRaw === 'CONCERT' || eventTypeRaw === 'CATEGORY' ? eventTypeRaw : null
  const eventIdRaw = fv('eventId')
  const eventId = eventIdRaw && /^\d+$/.test(eventIdRaw) ? Number(eventIdRaw) : null

  // Association OBLIGATOIRE : répétition, concert ou catégorie valide
  if (!eventType || !eventId) {
    fs.unlinkSync(file.filepath)
    return NextResponse.json({ error: 'Chaque photo doit être associée à une répétition, un concert ou une catégorie.', code: 'EVENT_REQUIRED' }, { status: 400 })
  }

  let eventLabel = fv('eventLabel')?.slice(0, 200) || null
  // Vérifie l'existence et récupère un libellé fiable côté serveur
  if (eventType === 'REHEARSAL') {
    const r = await prisma.rehearsal.findFirst({ where: { id: eventId, groupId }, select: { date: true, location: true } })
    if (!r) { fs.unlinkSync(file.filepath); return NextResponse.json({ error: 'Répétition introuvable.' }, { status: 400 }) }
    eventLabel = `🎵 Répétition du ${fmtDate(r.date)}${r.location ? ` (${r.location})` : ''}`
  } else if (eventType === 'CONCERT') {
    const c = await prisma.concert.findFirst({ where: { id: eventId, groupId }, select: { date: true, name: true } })
    if (!c) { fs.unlinkSync(file.filepath); return NextResponse.json({ error: 'Concert introuvable.' }, { status: 400 }) }
    eventLabel = `🎭 ${c.name} — ${fmtDate(c.date)}`
  } else {
    const cat = await prisma.galleryCategory.findFirst({ where: { id: eventId, groupId }, select: { name: true } })
    if (!cat) { fs.unlinkSync(file.filepath); return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 400 }) }
    eventLabel = `📁 ${cat.name}`
  }

  const relativePath = `/uploads/galerie/${path.basename(file.filepath)}`

  const [photo] = await prisma.$transaction([
    prisma.galleryPhoto.create({
      data: { groupId, uploaderId: userId, filePath: relativePath, fileSize, caption, eventType, eventId, eventLabel },
      select: {
        id: true, filePath: true, fileSize: true, caption: true,
        eventType: true, eventId: true, eventLabel: true, createdAt: true,
        uploaderId: true, uploader: { select: { id: true, name: true } },
      },
    }),
    prisma.group.update({ where: { id: groupId }, data: { storageUsedBytes: { increment: BigInt(fileSize) } } }),
  ])

  return NextResponse.json({ ...photo, mine: true }, { status: 201 })
}

// DELETE ?scope=all — vide l'album (chef uniquement)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const acc = await access(userId, groupId, isAdmin)
  if (!acc) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  if (req.nextUrl.searchParams.get('scope') !== 'all') {
    return NextResponse.json({ error: 'Action non supportée.' }, { status: 400 })
  }
  if (!acc.isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const photos = await prisma.galleryPhoto.findMany({ where: { groupId }, select: { id: true, filePath: true, fileSize: true } })
  if (photos.length === 0) return NextResponse.json({ ok: true, deleted: 0 })

  const totalBytes = photos.reduce((s, p) => s + (p.fileSize || 0), 0)
  for (const p of photos) {
    try { fs.unlinkSync(path.join('./public', p.filePath)) } catch { /* fichier déjà absent */ }
  }
  await prisma.$transaction([
    prisma.galleryPhoto.deleteMany({ where: { groupId } }),
    prisma.group.update({ where: { id: groupId }, data: { storageUsedBytes: { decrement: BigInt(Math.min(totalBytes, Number.MAX_SAFE_INTEGER)) } } }),
  ])
  return NextResponse.json({ ok: true, deleted: photos.length })
}
