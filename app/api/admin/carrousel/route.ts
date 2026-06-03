import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export const SLIDES_DIR = path.join(process.cwd(), 'public', 'uploads', 'slides')
fs.mkdirSync(SLIDES_DIR, { recursive: true })

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function saveSlideImage(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer())
  const name = `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`
  const out = await sharp(buf)
    .rotate()
    .resize(1280, 820, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
  fs.writeFileSync(path.join(SLIDES_DIR, name), out)
  return `/uploads/slides/${name}`
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const slides = await prisma.homeSlide.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(slides)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const form = await req.formData()
  const title = String(form.get('title') || '').trim()
  if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const subtitle = String(form.get('subtitle') || '').trim() || null
  const linkUrl = String(form.get('linkUrl') || '').trim() || null
  const published = form.get('published') !== 'false'

  const file = form.get('image') as File | null
  let imageUrl: string | null = null
  if (file && typeof file === 'object' && file.size > 0) {
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (10 Mo max).' }, { status: 400 })
    imageUrl = await saveSlideImage(file)
  }

  const agg = await prisma.homeSlide.aggregate({ _max: { sortOrder: true } })
  const slide = await prisma.homeSlide.create({
    data: { title, subtitle, linkUrl, published, imageUrl, sortOrder: (agg._max.sortOrder ?? 0) + 1 },
  })
  return NextResponse.json(slide, { status: 201 })
}
