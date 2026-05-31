import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const UPLOADS_ROOT = path.join(PUBLIC_DIR, 'uploads')

export interface OrphanFile {
  path: string       // chemin public (/uploads/...)
  name: string
  sizeBytes: number
  mtime: string
  category: string   // ressources | covers | avatars | group-pages | tutoriels
}

/**
 * Liste tous les fichiers de /uploads qui ne sont plus référencés en base.
 * Résolution des références :
 *  - chemins exacts : ressources, séquences, soumissions, ressources partagées,
 *    tutoriels, avatars utilisateurs, couvertures de groupe.
 *  - /uploads/group-pages/{groupId}-… : référencé si le groupe existe encore.
 *  - .gitkeep : toujours protégé.
 */
export async function listOrphanFiles(): Promise<OrphanFile[]> {
  if (!fs.existsSync(UPLOADS_ROOT)) return []

  const exact = new Set<string>()
  const add = (p?: string | null) => {
    if (!p) return
    const c = p.split('?')[0].split('#')[0]
    if (!c.startsWith('/uploads/')) return
    try { exact.add(decodeURIComponent(c)) } catch { exact.add(c) }
  }
  // Extrait TOUT chemin /uploads/... contenu dans un champ JSON / texte riche
  // (ex: photos de cartes membres, plans de scène, fiches techniques, descriptions).
  const scan = (text?: string | null) => {
    if (!text) return
    const re = /\/uploads\/[^\s"'<>)\\]+/g
    const matches = text.match(re)
    if (matches) for (const m of matches) add(m)
  }

  const [resources, sequences, pendings, shared, tutorials, users, groups, annonces, pages, techRiders, stageLayouts] = await Promise.all([
    prisma.resource.findMany({ select: { filePath: true } }),
    prisma.songSequence.findMany({ select: { filePath: true } }),
    prisma.pendingResource.findMany({ select: { filePath: true } }),
    prisma.groupSharedResource.findMany({ select: { filePath: true } }),
    prisma.tutorial.findMany({ select: { videoPath: true } }),
    prisma.user.findMany({ select: { avatarUrl: true } }),
    prisma.group.findMany({ select: { id: true, coverUrl: true } }),
    prisma.annonce.findMany({ select: { photoPath: true, description: true } }),
    prisma.groupPage.findMany({ select: { memberCards: true, bio: true } }),
    prisma.techRider.findMany({ select: { content: true } }),
    prisma.stageLayout.findMany({ select: { content: true } }),
  ])
  resources.forEach((r) => add(r.filePath))
  sequences.forEach((r) => add(r.filePath))
  pendings.forEach((r) => add(r.filePath))
  shared.forEach((r) => add(r.filePath))
  tutorials.forEach((r) => add(r.videoPath))
  users.forEach((r) => add(r.avatarUrl))
  groups.forEach((r) => add(r.coverUrl))
  // Annonces : photo (chemin direct) + description (texte riche)
  annonces.forEach((a) => { add(a.photoPath); scan(a.description) })
  // Champs JSON / texte riche pouvant contenir des chemins /uploads/...
  pages.forEach((p) => { scan(JSON.stringify(p.memberCards)); scan(p.bio) })
  techRiders.forEach((t) => scan(JSON.stringify(t.content)))
  stageLayouts.forEach((s) => scan(JSON.stringify(s.content)))
  const groupIds = new Set(groups.map((g) => String(g.id)))

  // Marge de sécurité : ne jamais considérer orphelin un fichier modifié récemment
  // (un upload peut être en cours / sa ligne en base juste après l'écriture disque).
  const SAFETY_MS = 24 * 60 * 60 * 1000
  const now = Date.now()

  const orphans: OrphanFile[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, e.name)
      if (e.isDirectory()) { walk(fp); continue }
      if (e.name === '.gitkeep') continue
      const rel = '/uploads/' + path.relative(UPLOADS_ROOT, fp).split(path.sep).join('/')
      if (exact.has(rel)) continue
      if (rel.startsWith('/uploads/group-pages/')) {
        const gid = e.name.split('-')[0]
        if (groupIds.has(gid)) continue
      }
      let st: fs.Stats
      try { st = fs.statSync(fp) } catch { continue }
      if (now - st.mtimeMs < SAFETY_MS) continue // fichier trop récent → on ne le touche pas
      const sub = path.relative(UPLOADS_ROOT, path.dirname(fp)).split(path.sep)[0] || ''
      const category = ['covers', 'avatars', 'group-pages', 'tutoriels'].includes(sub) ? sub : 'ressources'
      orphans.push({ path: rel, name: e.name, sizeBytes: st.size, mtime: st.mtime.toISOString(), category })
    }
  }
  walk(UPLOADS_ROOT)
  return orphans.sort((a, b) => b.sizeBytes - a.sizeBytes)
}

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
