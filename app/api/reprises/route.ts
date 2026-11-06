import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { reprisesUser, REPRISES_MAX_BYTES, REPRISES_TYPES } from '@/lib/reprises'
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
    select: { id: true, title: true, style: true, performer: true, composer: true, filePath: true, fileType: true, shareToken: true },
  })
  return NextResponse.json(scores)
}

export async function POST(req: NextRequest) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })

  const title = clean(form.get('title'), 150)
  if (!title) return NextResponse.json({ error: 'Le titre est obligatoire.' }, { status: 400 })
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
  const fileType = REPRISES_TYPES[file.type]
  if (!fileType) return NextResponse.json({ error: 'Format accepté : PDF, JPG, PNG, WEBP ou GIF.' }, { status: 400 })
  if (file.size > REPRISES_MAX_BYTES) return NextResponse.json({ error: 'Fichier trop lourd (25 Mo maximum).' }, { status: 413 })

  // Titre déjà présent (ou voisin) : on refuse, sauf si l'utilisateur maintient l'ajout.
  if (form.get('force') !== '1') {
    const existants = await prisma.coverScore.findMany({ where: { userId: u.userId }, select: { id: true, title: true, performer: true } })
    const similaires = titresSimilaires(title, existants)
    if (similaires.length > 0) {
      return NextResponse.json({ error: 'Un titre identique ou voisin existe déjà.', code: 'DOUBLON', similaires }, { status: 409 })
    }
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'reprises')
  fs.mkdirSync(dir, { recursive: true })
  const ext = fileType === 'pdf' ? '.pdf' : '.' + (file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1])
  const name = `${crypto.randomBytes(12).toString('hex')}${ext}`
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()))

  const score = await prisma.coverScore.create({
    data: {
      userId: u.userId, title, style: clean(form.get('style'), 80), performer: clean(form.get('performer'), 120),
      composer: clean(form.get('composer'), 120), filePath: `/uploads/reprises/${name}`, fileType, fileSize: file.size,
    },
  })
  return NextResponse.json(score, { status: 201 })
}
