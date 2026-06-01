import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
function statSize(rel?: string | null): number {
  if (!rel) return 0
  const clean = rel.split('?')[0].split('#')[0]
  if (!clean.startsWith('/uploads/')) return 0
  try {
    const abs = path.join(PUBLIC_DIR, decodeURIComponent(clean))
    return fs.existsSync(abs) ? fs.statSync(abs).size : 0
  } catch { return 0 }
}

interface FileRow { label: string; name: string; type: string; sizeBytes: number; path: string; createdAt: string | null }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [groups, resources, sequences, pendings, shared, avatars, tutorials, annonces] = await Promise.all([
    prisma.group.findMany({ select: { id: true, name: true, coverUrl: true } }),
    prisma.resource.findMany({ select: { name: true, type: true, fileSize: true, filePath: true, createdAt: true, song: { select: { groupId: true, title: true } } } }),
    prisma.songSequence.findMany({ select: { title: true, kind: true, fileSize: true, filePath: true, createdAt: true, song: { select: { groupId: true, title: true } } } }),
    prisma.pendingResource.findMany({ select: { name: true, type: true, fileSize: true, filePath: true, createdAt: true, song: { select: { groupId: true, title: true } } } }),
    prisma.groupSharedResource.findMany({ where: { type: 'FILE' }, select: { title: true, fileSize: true, filePath: true, createdAt: true, groupId: true } }),
    prisma.user.findMany({ where: { avatarUrl: { startsWith: '/uploads/' } }, select: { name: true, avatarUrl: true } }),
    prisma.tutorial.findMany({ select: { title: true, fileName: true, fileSizeBytes: true, videoPath: true, createdAt: true } }),
    prisma.annonce.findMany({ where: { photoPath: { startsWith: '/uploads/' } }, select: { title: true, photoPath: true, createdAt: true, user: { select: { name: true } } } }),
  ])

  const map = new Map<number, { groupName: string; files: FileRow[] }>()
  groups.forEach((g) => map.set(g.id, { groupName: g.name, files: [] }))
  const push = (gid: number | null | undefined, row: FileRow) => {
    if (gid == null || !map.has(gid)) return
    map.get(gid)!.files.push(row)
  }

  resources.forEach((r) => {
    if (!r.filePath?.startsWith('/uploads/')) return // exclut les liens (LIEN)
    push(r.song.groupId, { label: `🎼 ${r.song.title}`, name: r.name, type: String(r.type), sizeBytes: r.fileSize || 0, path: r.filePath, createdAt: r.createdAt?.toISOString() ?? null })
  })
  sequences.forEach((s) => {
    push(s.song.groupId, { label: `🎚 ${s.song.title}`, name: s.title, type: String(s.kind), sizeBytes: s.fileSize || 0, path: s.filePath, createdAt: s.createdAt?.toISOString() ?? null })
  })
  pendings.forEach((p) => {
    if (!p.filePath?.startsWith('/uploads/')) return
    push(p.song.groupId, { label: `⏳ ${p.song.title} (soumission)`, name: p.name, type: String(p.type), sizeBytes: p.fileSize || 0, path: p.filePath, createdAt: p.createdAt?.toISOString() ?? null })
  })
  shared.forEach((s) => {
    if (!s.filePath?.startsWith('/uploads/')) return
    push(s.groupId, { label: '📒 Carnet partagé', name: s.title, type: 'FICHIER', sizeBytes: s.fileSize || 0, path: s.filePath, createdAt: s.createdAt?.toISOString() ?? null })
  })
  // Couvertures + photos de page publique (taille via disque)
  groups.forEach((g) => {
    if (g.coverUrl?.startsWith('/uploads/')) {
      push(g.id, { label: '🖼 Couverture', name: 'Image de couverture', type: 'IMAGE', sizeBytes: statSize(g.coverUrl), path: g.coverUrl.split('?')[0], createdAt: null })
    }
  })
  try {
    const dir = path.join(PUBLIC_DIR, 'uploads', 'group-pages')
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        const gid = Number(f.split('-')[0])
        if (map.has(gid)) {
          push(gid, { label: '🌐 Page publique', name: f, type: 'IMAGE', sizeBytes: statSize(`/uploads/group-pages/${f}`), path: `/uploads/group-pages/${f}`, createdAt: null })
        }
      }
    }
  } catch {}

  const groupsResult = Array.from(map.entries())
    .map(([groupId, v]: [number, { groupName: string; files: FileRow[] }]) => ({
      groupId, groupName: v.groupName,
      files: v.files.sort((a: FileRow, b: FileRow) => (b.createdAt || '').localeCompare(a.createdAt || '')),
      totalBytes: v.files.reduce((a: number, f: FileRow) => a + f.sizeBytes, 0),
    }))
    .filter((g) => g.files.length > 0)
    .sort((a, b) => b.totalBytes - a.totalBytes)

  // ── Hors groupe ──
  const others: { category: string; files: FileRow[]; totalBytes: number }[] = []
  const avatarFiles: FileRow[] = avatars.map((u) => ({ label: `👤 ${u.name}`, name: 'Avatar', type: 'IMAGE', sizeBytes: statSize(u.avatarUrl), path: (u.avatarUrl || '').split('?')[0], createdAt: null }))
  const tutoFiles: FileRow[] = tutorials.map((t) => ({ label: `🎬 ${t.title}`, name: t.fileName, type: 'VIDEO', sizeBytes: t.fileSizeBytes || 0, path: t.videoPath, createdAt: t.createdAt?.toISOString() ?? null }))
  const annonceFiles: FileRow[] = annonces.map((a) => ({ label: `📢 ${a.title} — ${a.user.name}`, name: 'Photo annonce', type: 'IMAGE', sizeBytes: statSize(a.photoPath), path: (a.photoPath || ''), createdAt: a.createdAt?.toISOString() ?? null }))
  const mkOther = (category: string, files: FileRow[]) => { if (files.length) others.push({ category, files, totalBytes: files.reduce((a, f) => a + f.sizeBytes, 0) }) }
  mkOther('Avatars utilisateurs', avatarFiles)
  mkOther('Tutoriels vidéo', tutoFiles)
  mkOther('Photos d\'annonces', annonceFiles)

  const allGroupBytes = groupsResult.reduce((a, g) => a + g.totalBytes, 0)
  const allOtherBytes = others.reduce((a, o) => a + o.totalBytes, 0)

  return NextResponse.json({
    groups: groupsResult,
    others,
    totals: { groupBytes: allGroupBytes, otherBytes: allOtherBytes, allBytes: allGroupBytes + allOtherBytes },
  })
}
