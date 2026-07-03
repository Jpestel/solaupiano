import { NextRequest, NextResponse } from 'next/server'
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

async function getAuthorizedRecording(groupId: number, recordingId: number) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }) }
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const recording = await prisma.voiceRecording.findUnique({ where: { id: recordingId } })
  if (!recording || recording.groupId !== groupId) return { error: NextResponse.json({ error: 'Introuvable.' }, { status: 404 }) }
  if (!isAdmin && recording.userId !== userId) return { error: NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }) }

  return { recording }
}

export async function GET(req: NextRequest, { params }: { params: { id: string; recordingId: string } }) {
  const groupId = Number(params.id)
  const recordingId = Number(params.recordingId)
  const result = await getAuthorizedRecording(groupId, recordingId)
  if (result.error) return result.error
  const recording = result.recording

  const filePath = localPathFromPublicUrl(recording.filePath)
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Fichier introuvable.' }, { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const etag = `"voice-${recording.id}-${fileSize}-${Math.round(stat.mtimeMs)}"`
  const contentType = recording.mimeType || 'audio/webm'
  const safeName = `${recording.title || 'prise-audio'}${path.extname(filePath) || '.webm'}`
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')

  const baseHeaders: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-cache',
    'Content-Disposition': `inline; filename="${safeName}"`,
    'Content-Type': contentType,
    ETag: etag,
  }

  const range = req.headers.get('range')
  const match = range ? /bytes=(\d+)-(\d*)/.exec(range) : null

  if (!match && req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: baseHeaders })
  }

  if (match) {
    const start = parseInt(match[1], 10)
    const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1
    if (start >= fileSize || start > end) {
      return new NextResponse(null, { status: 416, headers: { ...baseHeaders, 'Content-Range': `bytes */${fileSize}` } })
    }
    const chunkSize = end - start + 1
    const buffer = Buffer.alloc(chunkSize)
    const fd = fs.openSync(filePath, 'r')
    try { fs.readSync(fd, buffer, 0, chunkSize, start) } finally { fs.closeSync(fd) }
    return new NextResponse(buffer, {
      status: 206,
      headers: { ...baseHeaders, 'Content-Length': String(chunkSize), 'Content-Range': `bytes ${start}-${end}/${fileSize}` },
    })
  }

  return new NextResponse(fs.readFileSync(filePath), {
    headers: { ...baseHeaders, 'Content-Length': String(fileSize) },
  })
}

export async function DELETE(_req: Request, { params }: { params: { id: string; recordingId: string } }) {
  const groupId = Number(params.id)
  const recordingId = Number(params.recordingId)
  const result = await getAuthorizedRecording(groupId, recordingId)
  if (result.error) return result.error
  const recording = result.recording

  await prisma.voiceRecording.delete({ where: { id: recordingId } })

  const localPath = localPathFromPublicUrl(recording.filePath)
  if (localPath && fs.existsSync(localPath)) {
    try { fs.unlinkSync(localPath) } catch (error) { console.error('delete voice recording file', error) }
  }

  return NextResponse.json({ ok: true })
}
