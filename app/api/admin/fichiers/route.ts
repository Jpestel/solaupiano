import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listOrphanFiles, unlinkPublicFile } from '@/lib/file-cleanup'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return { error: NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }) }
  if (session.user.siteRole !== 'ADMIN') return { error: NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }) }
  return { error: null }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  const orphans = await listOrphanFiles()
  const totalBytes = orphans.reduce((a, o) => a + o.sizeBytes, 0)
  return NextResponse.json({ orphans, totalBytes })
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { paths } = await req.json().catch(() => ({ paths: [] }))
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: 'Aucun fichier indiqué.' }, { status: 400 })
  }

  // Re-validation serveur : on ne supprime QUE ce qui est réellement orphelin maintenant
  const orphans = await listOrphanFiles()
  const sizeByPath = new Map(orphans.map((o) => [o.path, o.sizeBytes]))

  let deleted = 0
  let freedBytes = 0
  for (const p of paths) {
    if (!sizeByPath.has(p)) continue // pas orphelin → on ignore (sécurité)
    if (unlinkPublicFile(p)) { deleted++; freedBytes += sizeByPath.get(p) || 0 }
  }

  return NextResponse.json({ deleted, freedBytes })
}
