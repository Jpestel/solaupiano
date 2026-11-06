import { getServerSession } from 'next-auth'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { authOptions } from '@/lib/auth'
import { hasModuleAccess } from '@/lib/module-access'
import { prisma } from '@/lib/prisma'

/** Utilisateur autorisé à se servir du module « reprises », ou null. */
export async function reprisesUser(): Promise<{ userId: number } | null> {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const userId = Number(session.user.id)
  if (session.user.siteRole === 'ADMIN' || await hasModuleAccess(userId, 'tool_reprises')) return { userId }
  return null
}

export const REPRISES_MAX_BYTES = 25 * 1024 * 1024
export const REPRISES_MAX_PAGES = 40
export const REPRISES_TYPES: Record<string, 'image' | 'pdf'> = {
  'application/pdf': 'pdf', 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
}

export const PAGE_SELECT = { id: true, position: true, filePath: true, fileType: true } as const

/** Contrôle des fichiers reçus (avant toute écriture sur le disque). Renvoie un message d'erreur ou null. */
export function checkFiles(files: File[]): string | null {
  if (files.length === 0) return 'Aucun fichier reçu.'
  for (const f of files) {
    if (!REPRISES_TYPES[f.type]) return 'Format accepté : PDF, JPG, PNG, WEBP ou GIF.'
    if (f.size > REPRISES_MAX_BYTES) return `« ${f.name} » est trop lourd (25 Mo maximum par fichier).`
  }
  return null
}

/**
 * Enregistre un fichier. Les photos sont redressées (orientation EXIF), ramenées à 2400 px
 * maximum et recompressées en JPEG : une photo de téléphone de 6 Mo tombe vers 0,5 Mo,
 * ce qui accélère l'affichage page à page. Si la version allégée n'est pas plus petite
 * (ou en cas d'échec), le fichier d'origine est conservé tel quel. PDF et GIF : inchangés.
 */
export async function saveFile(file: File): Promise<{ filePath: string; fileType: 'image' | 'pdf'; fileSize: number }> {
  const fileType = REPRISES_TYPES[file.type]
  const dir = path.join(process.cwd(), 'public', 'uploads', 'reprises')
  fs.mkdirSync(dir, { recursive: true })
  const sub = file.type.split('/')[1]
  let ext = fileType === 'pdf' ? '.pdf' : '.' + (sub === 'jpeg' ? 'jpg' : sub)
  let data: Buffer = Buffer.from(await file.arrayBuffer())

  if (fileType === 'image' && file.type !== 'image/gif') {
    try {
      const light = await sharp(data).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: 85, mozjpeg: true }).toBuffer()
      if (light.length < data.length) { data = light; ext = '.jpg' }
    } catch { /* image illisible par sharp : on garde l'original */ }
  }

  const name = `${crypto.randomBytes(12).toString('hex')}${ext}`
  fs.writeFileSync(path.join(dir, name), data)
  return { filePath: `/uploads/reprises/${name}`, fileType, fileSize: data.length }
}

export function removeFile(filePath: string) {
  if (filePath.startsWith('/uploads/reprises/') && !filePath.includes('..')) {
    try { fs.unlinkSync(path.join(process.cwd(), 'public', filePath)) } catch { /* déjà absent */ }
  }
}

/** Pages d'une partition, dans l'ordre ; une partition d'avant les pages n'a que son fichier de couverture (id 0). */
export function pagesOf(score: { filePath: string; fileType: string; pages?: { id: number; position: number; filePath: string; fileType: string }[] }) {
  const pages = (score.pages ?? []).slice().sort((a, b) => a.position - b.position)
  return pages.length > 0 ? pages : [{ id: 0, position: 0, filePath: score.filePath, fileType: score.fileType }]
}

/** Recopie la première page dans la partition (couverture) après tout changement de pages. */
export async function syncCover(scoreId: number) {
  const first = await prisma.coverPage.findFirst({ where: { scoreId }, orderBy: { position: 'asc' }, select: { filePath: true, fileType: true, fileSize: true } })
  if (first) await prisma.coverScore.update({ where: { id: scoreId }, data: first })
}
