import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reprisesUser, removeFile, syncCover } from '@/lib/reprises'

export async function DELETE(_req: Request, { params }: { params: { id: string; pageId: string } }) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const page = await prisma.coverPage.findFirst({ where: { id: Number(params.pageId), scoreId: Number(params.id), score: { userId: u.userId } } })
  if (!page) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const count = await prisma.coverPage.count({ where: { scoreId: page.scoreId } })
  if (count <= 1) return NextResponse.json({ error: 'Une partition doit garder au moins une page.' }, { status: 400 })
  await prisma.coverPage.delete({ where: { id: page.id } })
  removeFile(page.filePath)
  await syncCover(page.scoreId)
  return NextResponse.json({ ok: true })
}
