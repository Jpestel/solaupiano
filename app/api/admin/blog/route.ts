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

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const [posts, categories] = await Promise.all([
    prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, slug: true, status: true, publishedAt: true, viewCount: true, createdAt: true, coverImage: true,
        category: { select: { id: true, name: true, color: true } },
        _count: { select: { likes: true } },
      },
    }),
    prisma.blogCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
  ])
  return NextResponse.json({ posts, categories })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const form = await req.formData()
  const title = String(form.get('title') || '').trim()
  if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })

  const rawContent = String(form.get('content') || '')
  const content = toBlogHtml(rawContent)
  const excerptIn = String(form.get('excerpt') || '').trim()
  const excerpt = excerptIn || htmlExcerpt(content)
  const categoryId = form.get('categoryId') ? Number(form.get('categoryId')) : null
  const status = form.get('status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'

  const file = form.get('cover') as File | null
  let coverImage: string | null = null
  if (file && typeof file === 'object' && file.size > 0) {
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'La couverture doit être une image.' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (10 Mo max).' }, { status: 400 })
    coverImage = await saveBlogImage(file)
  }

  const slug = await uniqueSlug(slugify(title))
  const post = await prisma.blogPost.create({
    data: {
      title, slug, content, excerpt, coverImage, categoryId, status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      authorId: Number(session.user.id),
    },
    select: { id: true, slug: true },
  })
  return NextResponse.json(post, { status: 201 })
}
