import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const AVATARS_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')
const MAX_BYTES = 300 * 1024 // 300 KB

// Ensure avatars directory exists
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true })
}

function parseForm(req: NextRequest): Promise<{ filePath: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }) // 10MB max input
    // @ts-ignore — formidable expects IncomingMessage, NextRequest is compatible enough
    form.parse(req as any, (err: any, _fields: any, files: any) => {
      if (err) return reject(err)
      const file = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar
      if (!file) return reject(new Error('Aucun fichier reçu.'))
      resolve({ filePath: file.filepath, mimeType: file.mimetype || 'image/jpeg' })
    })
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  let tempPath = ''
  try {
    const { filePath, mimeType } = await parseForm(req)
    tempPath = filePath

    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 })
    }

    // Compress: resize to 400×400 cover, output WebP, reduce quality until < 300KB
    let quality = 85
    let buffer: Buffer

    do {
      buffer = await sharp(tempPath)
        .resize(400, 400, { fit: 'cover', position: 'attention' })
        .webp({ quality })
        .toBuffer()
      quality -= 10
    } while (buffer.length > MAX_BYTES && quality > 10)

    // Save as {userId}.webp, overwriting any previous avatar
    const filename = `${userId}.webp`
    const destPath = path.join(AVATARS_DIR, filename)
    fs.writeFileSync(destPath, buffer)

    // Cache-bust with timestamp
    const avatarUrl = `/uploads/avatars/${filename}?v=${Date.now()}`

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
  } catch (err: any) {
    console.error('Avatar upload error:', err)
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'upload.' }, { status: 500 })
  } finally {
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  // Delete file if exists
  const filePath = path.join(AVATARS_DIR, `${userId}.webp`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  })

  return NextResponse.json({ ok: true })
}
