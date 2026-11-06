import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reprisesUser, checkFiles, saveFile, removeFile, syncCover, PAGE_SELECT, REPRISES_MAX_PAGES } from '@/lib/reprises'

async function own(id: number, userId: number) {
  return prisma.coverScore.findFirst({ where: { id, userId }, select: { id: true, filePath: true, fileType: true, fileSize: true } })
}

/** Ajoute des pages (un ou plusieurs `file`) à la fin de la partition. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const score = await own(Number(params.id), u.userId)
  if (!score) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const form = await req.formData().catch(() => null)
  const files = (form?.getAll('file') ?? []).filter((f): f is File => f instanceof File)
  const bad = checkFiles(files)
  if (bad) return NextResponse.json({ error: bad }, { status: 400 })

  let pages = await prisma.coverPage.findMany({ where: { scoreId: score.id }, orderBy: { position: 'asc' }, select: { id: true, position: true } })
  if (pages.length === 0) {
    // Partition d'avant les pages : son fichier devient la page 1.
    await prisma.coverPage.create({ data: { scoreId: score.id, position: 0, filePath: score.filePath, fileType: score.fileType, fileSize: score.fileSize } })
    pages = [{ id: 0, position: 0 }]
  }
  if (pages.length + files.length > REPRISES_MAX_PAGES) return NextResponse.json({ error: `${REPRISES_MAX_PAGES} pages maximum par partition.` }, { status: 400 })

  const saved = []
  try {
    for (const f of files) saved.push(await saveFile(f))
    await prisma.coverPage.createMany({ data: saved.map((s, i) => ({ scoreId: score.id, position: pages.length + i, ...s })) })
  } catch (e) {
    for (const s of saved) removeFile(s.filePath)
    throw e
  }
  const all = await prisma.coverPage.findMany({ where: { scoreId: score.id }, orderBy: { position: 'asc' }, select: PAGE_SELECT })
  return NextResponse.json({ pages: all }, { status: 201 })
}

/** Réordonne : { order: [pageId, …] } — doit contenir exactement toutes les pages. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const score = await own(Number(params.id), u.userId)
  if (!score) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const { order } = await req.json().catch(() => ({ order: null }))
  const pages = await prisma.coverPage.findMany({ where: { scoreId: score.id }, select: { id: true } })
  const ids = Array.isArray(order) ? order.map(Number) : []
  if (ids.length !== pages.length || !pages.every((p) => ids.includes(p.id))) return NextResponse.json({ error: 'Ordre invalide.' }, { status: 400 })
  await prisma.$transaction(ids.map((id, position) => prisma.coverPage.update({ where: { id }, data: { position } })))
  await syncCover(score.id)
  return NextResponse.json({ ok: true })
}
