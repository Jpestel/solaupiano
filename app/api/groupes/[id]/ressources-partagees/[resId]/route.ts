import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// DELETE — supprime une ressource partagée (auteur, chef ou admin)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; resId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const resId = Number(params.resId)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const resource = await prisma.groupSharedResource.findUnique({ where: { id: resId } })
  if (!resource || resource.groupId !== groupId) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  // Autorisé : auteur, chef du groupe, ou admin
  if (!isAdmin && resource.createdById !== userId) {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
    if (!m || m.groupRole !== 'CHEF') return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  // Supprime le fichier physique + libère le quota
  const ops: any[] = [prisma.groupSharedResource.delete({ where: { id: resId } })]
  if (resource.type === 'FILE' && resource.filePath) {
    try {
      const full = path.join(process.cwd(), 'public', resource.filePath)
      if (fs.existsSync(full)) fs.unlinkSync(full)
    } catch { /* ignore */ }
    if (resource.fileSize) {
      ops.push(prisma.group.update({
        where: { id: groupId },
        data: { storageUsedBytes: { decrement: BigInt(resource.fileSize) } },
      }))
    }
  }
  await prisma.$transaction(ops)

  return NextResponse.json({ ok: true })
}
