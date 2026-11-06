import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reprisesUser, checkFiles, saveFile, removeFile, PAGE_SELECT, REPRISES_MAX_PAGES } from '@/lib/reprises'
import { titresSimilaires } from '@/lib/reprises-similarite'

export const dynamic = 'force-dynamic'

const clean = (v: FormDataEntryValue | null, max: number) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : ''
  return s || null
}

export async function GET() {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const scores = await prisma.coverScore.findMany({
    where: { userId: u.userId }, orderBy: { title: 'asc' },
    select: {
      id: true, title: true, style: true, performer: true, composer: true, filePath: true, fileType: true, shareToken: true,
      pages: { select: PAGE_SELECT, orderBy: { position: 'asc' } },
    },
  })
  return NextResponse.json(scores)
}

/** Création : un ou plusieurs fichiers (`file`, dans l'ordre des pages). */
export async function POST(req: NextRequest) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  const title = clean(form.get('title'), 150)
  if (!title) return NextResponse.json({ error: 'Le titre est obligatoire.' }, { status: 400 })
  const files = form.getAll('file').filter((f): f is File => f instanceof File)
  if (files.length > REPRISES_MAX_PAGES) return NextResponse.json({ error: `${REPRISES_MAX_PAGES} pages maximum par partition.` }, { status: 400 })
  const bad = checkFiles(files)
  if (bad) return NextResponse.json({ error: bad }, { status: 400 })

  // Titre déjà présent (ou voisin) : on refuse, sauf si l'utilisateur maintient l'ajout.
  if (form.get('force') !== '1') {
    const existants = await prisma.coverScore.findMany({ where: { userId: u.userId }, select: { id: true, title: true, performer: true } })
    const similaires = titresSimilaires(title, existants)
    if (similaires.length > 0) {
      return NextResponse.json({ error: 'Un titre identique ou voisin existe déjà.', code: 'DOUBLON', similaires }, { status: 409 })
    }
  }

  const saved = []
  try {
    for (const f of files) saved.push(await saveFile(f))
    const score = await prisma.coverScore.create({
      data: {
        userId: u.userId, title, style: clean(form.get('style'), 80), performer: clean(form.get('performer'), 120),
        composer: clean(form.get('composer'), 120), ...saved[0],
        pages: { create: saved.map((s, i) => ({ position: i, ...s })) },
      },
    })
    return NextResponse.json(score, { status: 201 })
  } catch (e) {
    for (const s of saved) removeFile(s.filePath)
    throw e
  }
}
