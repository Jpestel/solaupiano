import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const TUTORIELS_DIR = path.join(process.cwd(), 'public', 'uploads', 'tutoriels')
const MAX_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB

fs.mkdirSync(TUTORIELS_DIR, { recursive: true })

// GET — list all tutorials (admin)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tutorials = await prisma.tutorial.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] })
  return NextResponse.json(tutorials)
}

// POST — upload video + create tutorial
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('video') as File | null
    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string)?.trim() || null
    const moduleKey = (formData.get('moduleKey') as string)?.trim() || null
    const order = parseInt(formData.get('order') as string || '0', 10) || 0
    const published = formData.get('published') === 'true'

    if (!file || file.size === 0) return NextResponse.json({ error: 'Aucun fichier vidéo.' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
    if (!file.type.startsWith('video/')) return NextResponse.json({ error: 'Le fichier doit être une vidéo.' }, { status: 400 })
    if (file.size > MAX_SIZE_BYTES) return NextResponse.json({ error: 'Fichier trop volumineux (max 500 Mo).' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const safeName = `tuto_${Date.now()}.${ext}`
    const destPath = path.join(TUTORIELS_DIR, safeName)

    const arrayBuffer = await file.arrayBuffer()
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer))

    const tutorial = await prisma.tutorial.create({
      data: {
        title,
        description,
        moduleKey: moduleKey || null,
        videoPath: `/uploads/tutoriels/${safeName}`,
        fileName: file.name,
        fileSizeBytes: file.size,
        order,
        published,
      },
    })

    return NextResponse.json(tutorial, { status: 201 })
  } catch (err: any) {
    console.error('Tutorial upload error:', err)
    return NextResponse.json({ error: err.message || 'Erreur lors de l\'upload.' }, { status: 500 })
  }
}
