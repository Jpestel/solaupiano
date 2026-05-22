import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const AVATARS_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')
const MAX_BYTES = 300 * 1024 // 300 KB

// Ensure avatars directory exists at startup
fs.mkdirSync(AVATARS_DIR, { recursive: true })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  try {
    // App Router native FormData parsing (no formidable needed)
    const formData = await req.formData()
    const file = formData.get('avatar') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 10 Mo.' }, { status: 400 })
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Compress: resize 400×400 cover, WebP, reduce quality until < 300 KB
    let quality = 85
    let outputBuffer: Buffer

    do {
      outputBuffer = await sharp(inputBuffer)
        .rotate()  // auto-rotation selon les métadonnées EXIF (photos téléphone)
        .resize(400, 400, { fit: 'cover', position: 'attention' })
        .webp({ quality })
        .toBuffer()
      quality -= 10
    } while (outputBuffer.length > MAX_BYTES && quality > 10)

    // Save as {userId}.webp — overwrite any previous avatar
    const filename = `${userId}.webp`
    const destPath = path.join(AVATARS_DIR, filename)
    fs.writeFileSync(destPath, outputBuffer)

    // Cache-bust with timestamp so the browser reloads the new image
    const avatarUrl = `/uploads/avatars/${filename}?v=${Date.now()}`

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    return NextResponse.json({ avatarUrl })
  } catch (err: any) {
    console.error('Avatar upload error:', err)
    return NextResponse.json({ error: err.message || "Erreur lors de l'upload." }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)

  const filePath = path.join(AVATARS_DIR, `${userId}.webp`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  })

  return NextResponse.json({ ok: true })
}
