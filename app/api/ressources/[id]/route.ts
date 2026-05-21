import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

import fs from 'fs'
import path from 'path'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { song: true },
  })

  if (!resource) return NextResponse.json({ error: 'Ressource introuvable.' }, { status: 404 })

  // Check group membership
  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: resource.song.groupId } },
  })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  // Serve file
  const filePath = resource.filePath.startsWith('/')
    ? path.join(process.cwd(), 'public', resource.filePath)
    : path.join(process.cwd(), resource.filePath)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Fichier introuvable.' }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()

  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/m4a',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }

  const contentType = mimeTypes[ext] || 'application/octet-stream'

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${resource.name}${ext}"`,
      'Content-Length': String(fileBuffer.length),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)
  const body = await req.json()
  const { name, filePath } = body

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { song: true },
  })

  if (!resource) return NextResponse.json({ error: 'Ressource introuvable.' }, { status: 404 })

  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: resource.song.groupId } },
  })
  const isChef = membership?.groupRole === 'CHEF'

  if (!isAdmin && !isChef) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const data: { name?: string; filePath?: string } = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if ((resource.type as string) === 'LIEN' && typeof filePath === 'string' && filePath.trim()) data.filePath = filePath.trim()

  const updated = await prisma.resource.update({ where: { id: resourceId }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const resourceId = Number(params.id)

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { song: true },
  })

  if (!resource) return NextResponse.json({ error: 'Ressource introuvable.' }, { status: 404 })

  // Check: uploader or chef of group
  const isUploader = resource.uploadedById === userId
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: resource.song.groupId } },
  })
  const isChef = membership?.groupRole === 'CHEF'

  if (!isUploader && !isChef && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  // Delete file from disk
  const filePath = resource.filePath.startsWith('/')
    ? path.join(process.cwd(), 'public', resource.filePath)
    : path.join(process.cwd(), resource.filePath)

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (err) {
    console.error('Error deleting file:', err)
  }

  const ops: Parameters<typeof prisma.$transaction>[0] = [
    prisma.resource.delete({ where: { id: resourceId } }),
  ]
  if (resource.fileSize && resource.fileSize > 0) {
    ops.push(
      prisma.$executeRaw`UPDATE \`Group\` SET storageUsedBytes = GREATEST(0, storageUsedBytes - ${resource.fileSize}) WHERE id = ${resource.song.groupId}` as any
    )
  }
  await prisma.$transaction(ops)

  return NextResponse.json({ success: true })
}
