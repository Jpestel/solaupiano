import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify, toBlogHtml, htmlExcerpt } from '@/lib/blog'
import { saveBlogImage, uniqueSlug } from '@/lib/blog-server'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

// GET — un article (pour l'édition)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const post = await prisma.blogPost.findUnique({ where: { id: Number(params.id) } })
  if (!post) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  return NextResponse.json(post)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const id = Number(params.id)
  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const form = await req.formData()
  const data: Record<string, unknown> = {}

  if (form.has('title')) {
    const title = String(form.get('title') || '').trim()
    if (!title) return NextResponse.json({ error: 'Titre requis.' }, { status: 400 })
    data.title = title
    // re-slug si le slug n'a pas été personnalisé manuellement
    if (form.get('reslug') === 'true') data.slug = await uniqueSlug(slugify(title), id)
  }
  if (form.has('content')) data.content = toBlogHtml(String(form.get('content') || ''))
  if (form.has('excerpt')) {
    const ex = String(form.get('excerpt') || '').trim()
    data.excerpt = ex || htmlExcerpt(String(data.content ?? existing.content))
  }
  if (form.has('categoryId')) data.categoryId = form.get('categoryId') ? Number(form.get('categoryId')) : null

  if (form.has('status')) {
    const status = form.get('status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
    data.status = status
    if (status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date()
  }

  const file = form.get('cover') as File | null
  if (file && typeof file === 'object' && file.size > 0) {
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'La couverture doit être une image.' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (10 Mo max).' }, { status: 400 })
    data.coverImage = await saveBlogImage(file)
  } else if (form.get('removeCover') === 'true') {
    data.coverImage = null
  }

  const post = await prisma.blogPost.update({ where: { id }, data, select: { id: true, slug: true } })
  return NextResponse.json(post)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  await prisma.blogPost.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
