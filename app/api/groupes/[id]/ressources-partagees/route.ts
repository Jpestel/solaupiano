import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupStorageInfo } from '@/lib/storage'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const SELECT = {
  id: true, type: true, title: true, url: true, address: true, phone: true, email: true,
  note: true, filePath: true, fileSize: true, createdAt: true, createdById: true,
  createdBy: { select: { id: true, name: true } },
}

async function membership(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return true
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  return !!m
}

// GET — liste des ressources partagées du groupe
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!await membership(userId, groupId, isAdmin)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const resources = await prisma.groupSharedResource.findMany({
    where: { groupId }, orderBy: { createdAt: 'desc' }, select: SELECT,
  })
  return NextResponse.json(resources)
}

// POST — créer une ressource (JSON pour lien/boutique/contact/note, multipart pour fichier)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!await membership(userId, groupId, isAdmin)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const contentType = req.headers.get('content-type') || ''

  // ── Fichier (multipart) ─────────────────────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const storageInfo = await getGroupStorageInfo(groupId)
    if (storageInfo.limitBytes <= 0) {
      return NextResponse.json({ error: "L'ajout de fichiers n'est pas disponible avec ce plan (quota à 0).", code: 'PLAN_FEATURE_LOCKED' }, { status: 403 })
    }

    const uploadDir = './public/uploads/partagees'
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    const form = formidable({ uploadDir, keepExtensions: true, maxFileSize: 100 * 1024 * 1024, filename: (_n, ext) => `${Date.now()}-${userId}${ext}` })

    const arrayBuffer = await req.arrayBuffer()
    const { Readable } = require('stream')
    const stream = Readable.from(Buffer.from(arrayBuffer))
    stream.headers = { 'content-type': contentType, 'content-length': req.headers.get('content-length') || '0' }
    const [fields, files] = await form.parse(stream as Parameters<typeof form.parse>[0])

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    const fileSize = file.size || 0

    if (storageInfo.usedBytes + fileSize > storageInfo.limitBytes) {
      fs.unlinkSync(file.filepath)
      return NextResponse.json({ error: `Quota de stockage dépassé (limite : ${storageInfo.limitGb} Go).`, code: 'STORAGE_QUOTA_EXCEEDED' }, { status: 413 })
    }

    const title = (Array.isArray(fields.title) ? fields.title[0] : fields.title)?.trim() || file.originalFilename || 'Fichier'
    const note = (Array.isArray(fields.note) ? fields.note[0] : fields.note)?.trim() || null
    const relativePath = `/uploads/partagees/${path.basename(file.filepath)}`

    const [resource] = await prisma.$transaction([
      prisma.groupSharedResource.create({
        data: { groupId, type: 'FILE', title, note, filePath: relativePath, fileSize, createdById: userId },
        select: SELECT,
      }),
      prisma.group.update({ where: { id: groupId }, data: { storageUsedBytes: { increment: BigInt(fileSize) } } }),
    ])
    return NextResponse.json(resource, { status: 201 })
  }

  // ── Lien / Boutique / Contact / Note (JSON) ─────────────────────────────────
  const body = await req.json()
  const { type, title, url, address, phone, email, note } = body
  const validTypes = ['LINK', 'SHOP', 'CONTACT', 'NOTE']
  if (!validTypes.includes(type)) return NextResponse.json({ error: 'Type invalide.' }, { status: 400 })
  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const resource = await prisma.groupSharedResource.create({
    data: {
      groupId, type, title: title.trim().slice(0, 150),
      url: url?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      note: note?.trim()?.slice(0, 1000) || null,
      createdById: userId,
    },
    select: SELECT,
  })
  return NextResponse.json(resource, { status: 201 })
}
