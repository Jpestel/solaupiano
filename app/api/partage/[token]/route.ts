import { NextRequest, NextResponse } from 'next/server'
import { sharedScore, sharedSelection, readPageFile } from '@/lib/reprises-partage'

export const dynamic = 'force-dynamic'

/**
 * Fichier d'une partition partagée, servi uniquement tant que le lien existe.
 *  - jeton d'une partition : le fichier de cette partition ;
 *  - jeton d'une sélection : `?s=<id>` doit désigner une partition de la sélection.
 * `?p=<id>` choisit la page (la première par défaut) ; elle doit appartenir à la partition.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  let scoreId: number | null = null
  const single = await sharedScore(params.token)
  if (single) scoreId = single.id
  else {
    const sel = await sharedSelection(params.token)
    const wanted = Number(req.nextUrl.searchParams.get('s'))
    if (sel && sel.scores.some((x) => x.id === wanted)) scoreId = wanted
  }
  if (scoreId === null) return new NextResponse('Lien invalide ou partage arrêté.', { status: 404 })
  const p = req.nextUrl.searchParams.get('p')
  const file = await readPageFile(scoreId, p === null ? -1 : Number(p))
  if (!file) return new NextResponse('Fichier introuvable.', { status: 404 })
  return new NextResponse(new Uint8Array(file.data), {
    headers: { 'Content-Type': file.mime, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}
