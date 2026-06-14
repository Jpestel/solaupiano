import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify, BLOG_COLOR_KEYS } from '@/lib/blog'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const cats = await prisma.blogCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, color: true, sortOrder: true, _count: { select: { posts: true } } },
  })
  return NextResponse.json(cats)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const name = String(b.name || '').trim().slice(0, 50)
  if (!name) return NextResponse.json({ error: 'Nom requis.' }, { status: 400 })
  const color = BLOG_COLOR_KEYS.includes(b.color) ? b.color : 'indigo'

  // slug unique
  let slug = slugify(name); let n = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ex = await prisma.blogCategory.findUnique({ where: { slug }, select: { id: true } })
    if (!ex) break
    n++; slug = `${slugify(name)}-${n}`
  }
  const agg = await prisma.blogCategory.aggregate({ _max: { sortOrder: true } })
  const cat = await prisma.blogCategory.create({
    data: { name, slug, color, sortOrder: (agg._max.sortOrder ?? 0) + 1 },
  })
  return NextResponse.json(cat, { status: 201 })
}
