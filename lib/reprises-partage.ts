import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { pagesOf } from '@/lib/reprises'

export const newShareToken = () => crypto.randomBytes(18).toString('base64url')

const SELECT = {
  id: true, title: true, performer: true, composer: true, style: true, filePath: true, fileType: true,
  pages: { select: { id: true, position: true, filePath: true, fileType: true }, orderBy: { position: 'asc' as const } },
} as const

export type PublicPage = { id: number; fileType: string }
/** Ce que voit un visiteur : jamais de chemin de fichier. */
export type PublicScore = { id: number; title: string; performer: string | null; composer: string | null; style: string | null; pages: PublicPage[] }

type Row = { id: number; title: string; performer: string | null; composer: string | null; style: string | null; filePath: string; fileType: string; pages: { id: number; position: number; filePath: string; fileType: string }[] }
const toPublic = (r: Row): PublicScore => ({
  id: r.id, title: r.title, performer: r.performer, composer: r.composer, style: r.style,
  pages: pagesOf(r).map((p) => ({ id: p.id, fileType: p.fileType })),
})

/** Une partition partagée seule (jeton de la partition) — null si le partage est arrêté. */
export async function sharedScore(token: string): Promise<PublicScore | null> {
  if (!token || token.length < 10) return null
  const r = await prisma.coverScore.findUnique({ where: { shareToken: token }, select: SELECT })
  return r ? toPublic(r) : null
}

/** Une sélection partagée (jeton de la sélection). */
export async function sharedSelection(token: string): Promise<{ name: string | null; scores: PublicScore[] } | null> {
  if (!token || token.length < 10) return null
  const sel = await prisma.coverShare.findUnique({
    where: { token },
    select: { name: true, scores: { select: SELECT, orderBy: { title: 'asc' } } },
  })
  return sel ? { name: sel.name, scores: sel.scores.map(toPublic) } : null
}

const MIME: Record<string, string> = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }

/** Lit le fichier d'une page (id 0 = fichier de couverture d'une ancienne partition) ; jamais de chemin fourni par le visiteur. */
export async function readPageFile(scoreId: number, pageId: number): Promise<{ data: Buffer; mime: string } | null> {
  const sc = await prisma.coverScore.findUnique({ where: { id: scoreId }, select: { filePath: true, fileType: true, pages: { select: { id: true, position: true, filePath: true, fileType: true } } } })
  if (!sc) return null
  const pages = pagesOf(sc)
  const page = pageId === -1 ? pages[0] : pages.find((p) => p.id === pageId)
  if (!page || !page.filePath.startsWith('/uploads/reprises/') || page.filePath.includes('..')) return null
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'public', page.filePath))
    return { data, mime: MIME[path.extname(page.filePath).toLowerCase()] ?? 'application/octet-stream' }
  } catch { return null }
}
