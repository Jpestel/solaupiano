import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendMemberAnnonceRefused } from '@/lib/email'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// ── GET /api/annonces/[id] ──────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const annonce = await prisma.annonce.findUnique({
    where: { id: Number(params.id) },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
  if (!annonce || annonce.status === 'MASQUEE') {
    return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 })
  }

  // Contact info masqué si non connecté
  const result: any = { ...annonce }
  if (!session) {
    result.contactEmail = null
    result.contactPhone = null
    result.contactHidden = true
  }

  return NextResponse.json(result)
}

// ── PATCH /api/annonces/[id] — changement de statut ────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const annonce = await prisma.annonce.findUnique({ where: { id: Number(params.id) } })
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 })

  const isAdmin = session.user.siteRole === 'ADMIN'
  const isOwner = annonce.userId === Number(session.user.id)
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const body = await req.json()
  const { status, adminComment } = body

  const updated = await prisma.annonce.update({
    where: { id: Number(params.id) },
    data: {
      ...(status !== undefined && { status }),
      ...(adminComment !== undefined && { adminComment }),
    },
    include: { user: { select: { name: true, email: true } } },
  })

  // Email au membre si l'annonce est retirée/refusée par un admin
  if (status === 'MASQUEE' && isAdmin) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
      await sendMemberAnnonceRefused(
        { email: updated.user.email, name: updated.user.name },
        { id: updated.id, title: updated.title, adminComment: updated.adminComment },
        baseUrl,
      )
    } catch (e) {
      console.error('Email membre annonce refusée failed:', e)
    }
  }

  return NextResponse.json(updated)
}

// ── PUT /api/annonces/[id] — modification complète (remet en PENDING) ───────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const annonce = await prisma.annonce.findUnique({ where: { id: Number(params.id) } })
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 })

  const isOwner = annonce.userId === Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const uploadDir = process.env.UPLOAD_DIR || './public/uploads'
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024,
    filename: (_name, ext) => `annonce-${Date.now()}${ext}`,
  })

  const contentType = req.headers.get('content-type') || ''
  const contentLength = req.headers.get('content-length') || '0'
  const arrayBuffer = await req.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const { Readable } = require('stream')
  const stream = Readable.from(buffer)
  stream.headers = { 'content-type': contentType, 'content-length': contentLength }

  const [fields, files] = await form.parse(stream as Parameters<typeof form.parse>[0])
  const f = (key: string) => (Array.isArray(fields[key]) ? fields[key]![0] : fields[key]) as string | undefined

  const title = f('title')?.trim()
  const description = f('description')?.trim()
  const category = f('category')
  const price = f('price') ? Number(f('price')) : null
  const location = f('location')?.trim() || null
  const contactEmail = f('contactEmail')?.trim() || null
  const contactPhone = f('contactPhone')?.trim() || null
  const removePhoto = f('removePhoto') === 'true'

  if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
  if (!description) return NextResponse.json({ error: 'La description est requise.' }, { status: 400 })
  if (!contactEmail && !contactPhone) return NextResponse.json({ error: 'Au moins un moyen de contact est requis.' }, { status: 400 })

  // Gestion photo
  const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo
  let photoPath = annonce.photoPath

  if (removePhoto && annonce.photoPath) {
    const fullPath = `./public${annonce.photoPath}`
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
    photoPath = null
  }

  if (photoFile) {
    // Supprimer l'ancienne photo si elle existe
    if (annonce.photoPath) {
      const oldPath = `./public${annonce.photoPath}`
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }
    const fp = photoFile.filepath
    photoPath = fp.startsWith('./public') ? fp.replace('./public', '') : `/uploads/${path.basename(fp)}`
  }

  const updated = await prisma.annonce.update({
    where: { id: Number(params.id) },
    data: {
      title,
      description,
      ...(category && { category }),
      price,
      location,
      photoPath,
      contactEmail,
      contactPhone,
      // Remet en attente de validation seulement si c'est le propriétaire (pas l'admin)
      ...(isOwner && !isAdmin && { status: 'PENDING' }),
    },
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/annonces/[id] ───────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const annonce = await prisma.annonce.findUnique({ where: { id: Number(params.id) } })
  if (!annonce) return NextResponse.json({ error: 'Annonce introuvable.' }, { status: 404 })

  const isAdmin = session.user.siteRole === 'ADMIN'
  const isOwner = annonce.userId === Number(session.user.id)
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  if (annonce.photoPath) {
    const fullPath = `./public${annonce.photoPath}`
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
  }

  await prisma.annonce.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
