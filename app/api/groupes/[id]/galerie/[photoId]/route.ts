import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// DELETE — supprime une photo. Le chef (ou admin) peut tout supprimer ; un membre, ses propres photos.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const photoId = Number(params.photoId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true } })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  let isChef = isAdmin
  if (!isAdmin) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
    if (!m) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    isChef = group.createdBy === userId || m.groupRole === 'CHEF'
  }

  const photo = await prisma.galleryPhoto.findFirst({ where: { id: photoId, groupId }, select: { id: true, filePath: true, fileSize: true, uploaderId: true } })
  if (!photo) return NextResponse.json({ error: 'Photo introuvable.' }, { status: 404 })

  if (!isChef && photo.uploaderId !== userId) {
    return NextResponse.json({ error: 'Vous ne pouvez supprimer que vos propres photos.' }, { status: 403 })
  }

  try { fs.unlinkSync(path.join('./public', photo.filePath)) } catch { /* déjà absent */ }
  await prisma.$transaction([
    prisma.galleryPhoto.delete({ where: { id: photo.id } }),
    prisma.group.update({ where: { id: groupId }, data: { storageUsedBytes: { decrement: BigInt(photo.fileSize || 0) } } }),
  ])

  return NextResponse.json({ ok: true })
}
