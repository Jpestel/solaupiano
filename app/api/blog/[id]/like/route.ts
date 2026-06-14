import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — bascule le like de l'utilisateur connecté sur un article. Retourne { liked, count }.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Connectez-vous pour aimer cet article.' }, { status: 401 })
  const userId = Number(session.user.id)
  const postId = Number(params.id)

  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { id: true, status: true } })
  if (!post || post.status !== 'PUBLISHED') return NextResponse.json({ error: 'Article introuvable.' }, { status: 404 })

  const existing = await prisma.blogLike.findUnique({ where: { postId_userId: { postId, userId } }, select: { id: true } })
  let liked: boolean
  if (existing) {
    await prisma.blogLike.delete({ where: { id: existing.id } })
    liked = false
  } else {
    await prisma.blogLike.create({ data: { postId, userId } })
    liked = true
  }
  const count = await prisma.blogLike.count({ where: { postId } })
  return NextResponse.json({ liked, count })
}
