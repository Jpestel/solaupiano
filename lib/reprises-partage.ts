import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const newShareToken = () => crypto.randomBytes(18).toString('base64url')

const SELECT = { id: true, title: true, performer: true, composer: true, style: true, fileType: true } as const
export type PublicScore = { id: number; title: string; performer: string | null; composer: string | null; style: string | null; fileType: string }

/** Une partition partagée seule (jeton de la partition) — null si le partage est arrêté. */
export async function sharedScore(token: string): Promise<PublicScore | null> {
  if (!token || token.length < 10) return null
  return prisma.coverScore.findUnique({ where: { shareToken: token }, select: SELECT })
}

/** Une sélection partagée (jeton de la sélection). */
export async function sharedSelection(token: string): Promise<{ name: string | null; scores: PublicScore[] } | null> {
  if (!token || token.length < 10) return null
  const sel = await prisma.coverShare.findUnique({
    where: { token },
    select: { name: true, scores: { select: SELECT, orderBy: { title: 'asc' } } },
  })
  return sel
}

const MIME: Record<string, string> = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }

/** Lit le fichier d'une partition ; jamais de chemin fourni par le visiteur. */
export async function readScoreFile(scoreId: number): Promise<{ data: Buffer; mime: string } | null> {
  const sc = await prisma.coverScore.findUnique({ where: { id: scoreId }, select: { filePath: true } })
  if (!sc || !sc.filePath.startsWith('/uploads/reprises/') || sc.filePath.includes('..')) return null
  try {
    const data = fs.readFileSync(path.join(process.cwd(), 'public', sc.filePath))
    return { data, mime: MIME[path.extname(sc.filePath).toLowerCase()] ?? 'application/octet-stream' }
  } catch { return null }
}
