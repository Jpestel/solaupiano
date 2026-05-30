import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// PATCH — update tutorial metadata
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = Number(params.id)
  const body = await req.json()
  const { title, description, moduleKey, order, published } = body

  const tutorial = await prisma.tutorial.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description: description || null }),
      ...(moduleKey !== undefined && { moduleKey: moduleKey || null }),
      ...(order !== undefined && { order: Number(order) }),
      ...(published !== undefined && { published }),
    },
  })

  return NextResponse.json(tutorial)
}

// DELETE — delete tutorial + video file
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = Number(params.id)
  const tutorial = await prisma.tutorial.findUnique({ where: { id } })
  if (!tutorial) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove file
  const filePath = path.join(process.cwd(), 'public', tutorial.videoPath)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await prisma.tutorial.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
