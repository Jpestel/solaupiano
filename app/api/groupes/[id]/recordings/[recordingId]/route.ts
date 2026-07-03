import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

function localPathFromPublicUrl(filePath: string) {
  if (!filePath.startsWith('/uploads/')) return null
  const uploadRoot = process.env.UPLOAD_DIR || './public/uploads'
  return path.join(uploadRoot, filePath.replace(/^\/uploads\/?/, ''))
}

export async function DELETE(_req: Request, { params }: { params: { id: string; recordingId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const recordingId = Number(params.recordingId)
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const recording = await prisma.voiceRecording.findUnique({ where: { id: recordingId } })
  if (!recording || recording.groupId !== groupId) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  if (!isAdmin && recording.userId !== userId) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.voiceRecording.delete({ where: { id: recordingId } })

  const localPath = localPathFromPublicUrl(recording.filePath)
  if (localPath && fs.existsSync(localPath)) {
    try { fs.unlinkSync(localPath) } catch (error) { console.error('delete voice recording file', error) }
  }

  return NextResponse.json({ ok: true })
}
