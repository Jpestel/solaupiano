import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendAdminAnnonceNotification } from '@/lib/email'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// ── GET /api/annonces — liste publique ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = 20

  const where: any = {
    status: 'ACTIVE',
    expiresAt: { gte: new Date() },
  }
  if (category && category !== 'TOUS') where.category = category

  const [annonces, total] = await Promise.all([
    prisma.annonce.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.annonce.count({ where }),
  ])

  return NextResponse.json({ annonces, total, page, pages: Math.ceil(total / limit) })
}

// ── POST /api/annonces — créer une annonce ──────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  // Annonces ouvertes à tous les membres inscrits (email vérifié)

  const uploadDir = process.env.UPLOAD_DIR || './public/uploads'
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5 Mo pour les photos
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

  if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
  if (!description) return NextResponse.json({ error: 'La description est requise.' }, { status: 400 })
  if (!category) return NextResponse.json({ error: 'La catégorie est requise.' }, { status: 400 })
  if (!contactEmail && !contactPhone) return NextResponse.json({ error: 'Au moins un moyen de contact est requis.' }, { status: 400 })

  // Vérifier que la catégorie existe et est active
  const categoryExists = await prisma.annonceCategorie.findFirst({ where: { key: category, isActive: true } })
  if (!categoryExists) return NextResponse.json({ error: 'Catégorie invalide.' }, { status: 400 })

  // Photo
  const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo
  let photoPath: string | null = null
  if (photoFile) {
    const fp = photoFile.filepath
    photoPath = fp.startsWith('./public') ? fp.replace('./public', '') : `/uploads/${path.basename(fp)}`
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 60)

  const annonce = await prisma.annonce.create({
    data: {
      title,
      description,
      category,
      price,
      location,
      photoPath,
      contactEmail,
      contactPhone,
      userId,
      expiresAt,
      status: 'PENDING',
    },
    include: { user: { select: { name: true, email: true } } },
  })

  // Notifier l'admin par email
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
    await sendAdminAnnonceNotification(
      {
        id: annonce.id,
        title: annonce.title,
        category: categoryExists.label,
        location: annonce.location,
        userName: annonce.user.name,
        userEmail: annonce.user.email,
      },
      'jerompestel@gmail.com',
      baseUrl,
    )
  } catch (e) {
    console.error('Email admin annonce failed:', e)
  }

  return NextResponse.json(annonce, { status: 201 })
}
