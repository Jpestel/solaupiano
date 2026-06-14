import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BLOG_COLOR_KEYS } from '@/lib/blog'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim().slice(0, 50)
  if (BLOG_COLOR_KEYS.includes(b.color)) data.color = b.color
  if (Number.isFinite(Number(b.sortOrder))) data.sortOrder = Number(b.sortOrder)
  const cat = await prisma.blogCategory.update({ where: { id: Number(params.id) }, data })
  return NextResponse.json(cat)
}

// Supprime la catégorie (les articles passent à "sans catégorie" via SetNull)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  await prisma.blogCategory.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
