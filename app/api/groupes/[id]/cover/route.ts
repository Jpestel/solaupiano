import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const COVERS_DIR = path.join(process.cwd(), 'public', 'uploads', 'covers')
const MAX_BYTES = 500 * 1024 // 500 KB

fs.mkdirSync(COVERS_DIR, { recursive: true })

async function checkAccess(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return true
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { groupRole: true },
  })
  return membership?.groupRole === 'CHEF'
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!(await checkAccess(userId, groupId, isAdmin))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('cover') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 10 Mo.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    let quality = 85
    let outputBuffer: Buffer

    do {
      outputBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(600, 600, { fit: 'cover', position: 'attention' })
        .webp({ quality })
        .toBuffer()
      quality -= 10
    } while (outputBuffer.length > MAX_BYTES && quality > 10)

    const filename = `${groupId}.webp`
    fs.writeFileSync(path.join(COVERS_DIR, filename), outputBuffer)

    const coverUrl = `/uploads/covers/${filename}?v=${Date.now()}`
    await prisma.group.update({ where: { id: groupId }, data: { coverUrl } })

    return NextResponse.json({ coverUrl })
  } catch (err: any) {
    console.error('Cover upload error:', err)
    return NextResponse.json({ error: err.message || "Erreur lors de l'upload." }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  if (!(await checkAccess(userId, groupId, isAdmin))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const filePath = path.join(COVERS_DIR, `${groupId}.webp`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await prisma.group.update({ where: { id: groupId }, data: { coverUrl: null } })

  return NextResponse.json({ ok: true })
}
