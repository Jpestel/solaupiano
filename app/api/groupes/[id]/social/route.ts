import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

async function canPost(groupId: number, userId: number, isAdmin: boolean) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
  if (!group) return false
  return coChefCanDo({ createdBy: group.createdBy ?? null, chefPermissions: group.chefPermissions ?? null }, userId, isAdmin, 'social', 'post')
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const groupId = Number(params.id)
  if (!(await canPost(groupId, Number(session.user.id), session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const posts = await prisma.socialPost.findMany({
    where: { groupId }, orderBy: { createdAt: 'desc' }, take: 50,
    select: { id: true, caption: true, images: true, createdAt: true, author: { select: { name: true } } },
  })
  return NextResponse.json(posts.map((p) => ({ ...p, images: safeImages(p.images) })))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const groupId = Number(params.id)
  const userId = Number(session.user.id)
  if (!(await canPost(groupId, userId, session.user.siteRole === 'ADMIN'))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const b = await req.json().catch(() => ({}))
  const caption = String(b.caption || '').slice(0, 5000)
  const images = Array.isArray(b.images) ? b.images.filter((x: unknown) => typeof x === 'string').slice(0, 10) : []
  if (!caption.trim() && images.length === 0) {
    return NextResponse.json({ error: 'Ajoutez du texte ou au moins une image.' }, { status: 400 })
  }
  const post = await prisma.socialPost.create({
    data: { groupId, authorId: userId, caption, images: JSON.stringify(images) },
    select: { id: true, caption: true, images: true, createdAt: true, author: { select: { name: true } } },
  })
  return NextResponse.json({ ...post, images: safeImages(post.images) }, { status: 201 })
}

function safeImages(s: string): string[] {
  try { const a = JSON.parse(s); return Array.isArray(a) ? a : [] } catch { return [] }
}
