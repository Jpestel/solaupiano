import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const UPLOADS_ROOT = path.join(PUBLIC_DIR, 'uploads')

/**
 * Supprime un fichier local (/uploads/...) du disque.
 * Ignore les URLs externes / liens / valeurs vides. Tolère un suffixe ?v=…
 * Renvoie true si un fichier a effectivement été supprimé.
 */
export function unlinkPublicFile(relPath?: string | null): boolean {
  if (!relPath) return false
  const clean = relPath.split('?')[0].split('#')[0]
  if (!clean.startsWith('/uploads/')) return false
  let abs: string
  try { abs = path.join(PUBLIC_DIR, decodeURIComponent(clean)) } catch { abs = path.join(PUBLIC_DIR, clean) }
  // Sécurité anti path-traversal : rester sous public/uploads
  if (!abs.startsWith(UPLOADS_ROOT)) return false
  try {
    if (fs.existsSync(abs)) { fs.unlinkSync(abs); return true }
  } catch (e) {
    console.error('unlinkPublicFile failed:', relPath, e)
  }
  return false
}

/**
 * Supprime du disque tous les fichiers rattachés à un morceau :
 * ressources, séquences, et soumissions en attente.
 * Renvoie le nombre d'octets à décompter du quota du groupe
 * (ressources + séquences ; les soumissions ne sont pas comptées dans le quota).
 * À APPELER AVANT la suppression du morceau (les lignes sont nécessaires).
 */
export async function cleanupSongFiles(songId: number): Promise<number> {
  const [resources, sequences, pendings] = await Promise.all([
    prisma.resource.findMany({ where: { songId }, select: { filePath: true, fileSize: true } }),
    prisma.songSequence.findMany({ where: { songId }, select: { filePath: true, fileSize: true } }),
    prisma.pendingResource.findMany({ where: { songId }, select: { filePath: true } }),
  ])
  let bytes = 0
  for (const r of resources) { if (unlinkPublicFile(r.filePath)) bytes += r.fileSize || 0 }
  for (const s of sequences) { unlinkPublicFile(s.filePath); bytes += s.fileSize || 0 }
  for (const p of pendings) { unlinkPublicFile(p.filePath) }
  return bytes
}

/**
 * Supprime du disque TOUS les fichiers d'un groupe (avant suppression du groupe) :
 * fichiers de tous les morceaux, ressources partagées (carnet), photo de la page
 * publique et image de couverture.
 */
export async function cleanupGroupFiles(groupId: number): Promise<void> {
  const songs = await prisma.song.findMany({ where: { groupId }, select: { id: true } })
  await Promise.all(songs.map((s) => cleanupSongFiles(s.id)))

  const shared = await prisma.groupSharedResource.findMany({ where: { groupId }, select: { filePath: true } })
  for (const r of shared) unlinkPublicFile(r.filePath)

  // Photos de la page publique : /uploads/group-pages/{groupId}-{userId|banner}.webp
  try {
    const dir = path.join(UPLOADS_ROOT, 'group-pages')
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(`${groupId}-`)) { try { fs.unlinkSync(path.join(dir, f)) } catch {} }
      }
    }
  } catch {}

  // Image de couverture
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { coverUrl: true } })
  if (group?.coverUrl) unlinkPublicFile(group.coverUrl)
}
