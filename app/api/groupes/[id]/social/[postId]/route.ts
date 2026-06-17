import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; postId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const groupId = Number(params.id)
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true, chefPermissions: true } })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })
  // Réservé aux chefs / co-chefs (un simple membre ne peut pas gérer les posts).
  const isFounder = group.createdBy === userId
  const membership = isAdmin || isFounder ? null : await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } }, select: { groupRole: true },
  })
  const isChefHere = isAdmin || isFounder || membership?.groupRole === 'CHEF'
  if (!isChefHere || !coChefCanDo({ createdBy: group.createdBy ?? null, chefPermissions: group.chefPermissions ?? null }, userId, isAdmin, 'social', 'post')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const post = await prisma.socialPost.findFirst({ where: { id: Number(params.postId), groupId }, select: { id: true } })
  if (!post) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  await prisma.socialPost.delete({ where: { id: post.id } })
  return NextResponse.json({ ok: true })
}
