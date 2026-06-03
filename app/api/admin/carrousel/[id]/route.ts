import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import { saveSlideImage } from '../route'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

function removeLocalImage(url: string | null) {
  if (!url || !url.startsWith('/uploads/slides/')) return
  const p = path.join(process.cwd(), 'public', url)
  try { fs.unlinkSync(p) } catch { /* déjà absent */ }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const id = Number(params.id)
  const existing = await prisma.homeSlide.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Slide introuvable.' }, { status: 404 })

  const form = await req.formData()
  const data: Record<string, unknown> = {}

  if (form.has('title')) {
    const title = String(form.get('title') || '').trim()
    if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
    data.title = title
  }
  if (form.has('subtitle')) data.subtitle = String(form.get('subtitle') || '').trim() || null
  if (form.has('linkUrl')) data.linkUrl = String(form.get('linkUrl') || '').trim() || null
  if (form.has('published')) data.published = form.get('published') !== 'false'

  const file = form.get('image') as File | null
  if (file && typeof file === 'object' && file.size > 0) {
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (10 Mo max).' }, { status: 400 })
    removeLocalImage(existing.imageUrl)
    data.imageUrl = await saveSlideImage(file)
  }

  const slide = await prisma.homeSlide.update({ where: { id }, data })
  return NextResponse.json(slide)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const id = Number(params.id)
  const existing = await prisma.homeSlide.findUnique({ where: { id } })
  if (existing) {
    removeLocalImage(existing.imageUrl)
    await prisma.homeSlide.delete({ where: { id } })
  }
  return NextResponse.json({ ok: true })
}
