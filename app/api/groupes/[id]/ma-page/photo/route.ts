import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const DIR = path.join(process.cwd(), 'public', 'uploads', 'group-pages')
fs.mkdirSync(DIR, { recursive: true })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = isAdmin ? null : await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && membership?.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('photo') as File | null
  const targetUserId = formData.get('userId') as string | null

  if (!file || file.size === 0) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Le fichier doit être une image.' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)

  let quality = 85
  let outputBuffer: Buffer
  const MAX = 400 * 1024 // 400 KB

  do {
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(600, 600, { fit: 'cover', position: 'attention' })
      .webp({ quality })
      .toBuffer()
    quality -= 10
  } while (outputBuffer.length > MAX && quality > 10)

  const filename = `${groupId}-${targetUserId || 'banner'}.webp`
  fs.writeFileSync(path.join(DIR, filename), outputBuffer)

  return NextResponse.json({ photoUrl: `/uploads/group-pages/${filename}?v=${Date.now()}` })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')

  const filename = `${groupId}-${targetUserId || 'banner'}.webp`
  const filePath = path.join(DIR, filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  return NextResponse.json({ ok: true })
}
