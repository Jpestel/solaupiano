import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupStorageInfo } from '@/lib/storage'
import fs from 'fs'
import path from 'path'

async function requireChef(session: Awaited<ReturnType<typeof getServerSession>>, groupId: number) {
  if (!session) return false
  if (session.user.siteRole === 'ADMIN') return true
  const m = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId } },
  })
  return m?.groupRole === 'CHEF'
}

// POST → approve
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; pendingId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const pendingId = Number(params.pendingId)

  if (!await requireChef(session, groupId)) {
    return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })
  }

  const pending = await prisma.pendingResource.findUnique({ where: { id: pendingId } })
  if (!pending || pending.groupId !== groupId) {
    return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  }

  // Vérifier le quota au moment de l'acceptation (le plan a pu changer entre-temps)
  const storageInfo = await getGroupStorageInfo(groupId)
  const fileSize = Number(pending.fileSize ?? 0)
  if (storageInfo.limitBytes <= 0 || storageInfo.usedBytes + fileSize > storageInfo.limitBytes) {
    return NextResponse.json({
      error: storageInfo.limitBytes <= 0
        ? "Impossible d'accepter : le plan de ce groupe n'autorise pas le stockage de fichiers (quota 0)."
        : `Impossible d'accepter : quota de stockage dépassé (limite : ${storageInfo.limitGb} Go).`,
      code: 'STORAGE_QUOTA_EXCEEDED',
    }, { status: 413 })
  }

  await prisma.$transaction([
    prisma.resource.create({
      data: {
        songId: pending.songId,
        name: pending.name,
        type: pending.type,
        filePath: pending.filePath,
        fileSize: pending.fileSize,
        uploadedById: pending.submittedBy,
      },
    }),
    prisma.group.update({
      where: { id: groupId },
      data: { storageUsedBytes: { increment: BigInt(pending.fileSize ?? 0) } },
    }),
    prisma.pendingResource.delete({ where: { id: pendingId } }),
  ])

  return NextResponse.json({ ok: true })
}

// DELETE → reject
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; pendingId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const pendingId = Number(params.pendingId)

  if (!await requireChef(session, groupId)) {
    return NextResponse.json({ error: 'Réservé au chef.' }, { status: 403 })
  }

  const pending = await prisma.pendingResource.findUnique({ where: { id: pendingId } })
  if (!pending || pending.groupId !== groupId) {
    return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  }

  // Delete physical file
  try {
    const fullPath = path.join('./public', pending.filePath)
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
  } catch { /* ignore */ }

  await prisma.pendingResource.delete({ where: { id: pendingId } })

  return NextResponse.json({ ok: true })
}
