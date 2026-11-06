import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { reprisesUser } from '@/lib/reprises'
import { titresSimilaires } from '@/lib/reprises-similarite'

const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

async function own(id: number, userId: number) {
  return prisma.coverScore.findFirst({ where: { id, userId } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const score = await own(Number(params.id), u.userId)
  if (!score) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const b = await req.json().catch(() => ({}))
  const title = clean(b.title, 150)
  if (!title) return NextResponse.json({ error: 'Le titre est obligatoire.' }, { status: 400 })
  // Seulement si le titre change réellement.
  if (b.force !== true && title !== score.title) {
    const existants = await prisma.coverScore.findMany({ where: { userId: u.userId }, select: { id: true, title: true, performer: true } })
    const similaires = titresSimilaires(title, existants, score.id)
    if (similaires.length > 0) {
      return NextResponse.json({ error: 'Un titre identique ou voisin existe déjà.', code: 'DOUBLON', similaires }, { status: 409 })
    }
  }
  const updated = await prisma.coverScore.update({
    where: { id: score.id },
    data: { title, style: clean(b.style, 80), performer: clean(b.performer, 120), composer: clean(b.composer, 120) },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const score = await own(Number(params.id), u.userId)
  if (!score) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  await prisma.coverScore.delete({ where: { id: score.id } })
  if (score.filePath.startsWith('/uploads/reprises/') && !score.filePath.includes('..')) {
    try { fs.unlinkSync(path.join(process.cwd(), 'public', score.filePath)) } catch {}
  }
  return NextResponse.json({ ok: true })
}
