import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// DELETE — supprime une catégorie ET ses photos (chef / admin uniquement)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; categoryId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const categoryId = Number(params.categoryId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { createdBy: true } })
  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })

  let isChef = isAdmin
  if (!isAdmin) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
    if (!m) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    isChef = group.createdBy === userId || m.groupRole === 'CHEF'
  }
  if (!isChef) return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const cat = await prisma.galleryCategory.findFirst({ where: { id: categoryId, groupId }, select: { id: true } })
  if (!cat) return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })

  const photos = await prisma.galleryPhoto.findMany({
    where: { groupId, eventType: 'CATEGORY', eventId: categoryId },
    select: { filePath: true, fileSize: true },
  })
  const totalBytes = photos.reduce((s, p) => s + (p.fileSize || 0), 0)
  for (const p of photos) {
    try { fs.unlinkSync(path.join('./public', p.filePath)) } catch { /* déjà absent */ }
  }

  await prisma.$transaction([
    prisma.galleryPhoto.deleteMany({ where: { groupId, eventType: 'CATEGORY', eventId: categoryId } }),
    prisma.galleryCategory.delete({ where: { id: categoryId } }),
    ...(totalBytes > 0 ? [prisma.group.update({ where: { id: groupId }, data: { storageUsedBytes: { decrement: BigInt(totalBytes) } } })] : []),
  ])

  return NextResponse.json({ ok: true, deletedPhotos: photos.length })
}
