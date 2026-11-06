import { NextRequest, NextResponse } from 'next/server'
import { sharedScore, sharedSelection, readScoreFile } from '@/lib/reprises-partage'

export const dynamic = 'force-dynamic'

/**
 * Fichier d'une partition partagée, servi uniquement tant que le lien existe.
 *  - jeton d'une partition : le fichier de cette partition ;
 *  - jeton d'une sélection : `?s=<id>` doit désigner une partition de la sélection.
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
  const file = await readScoreFile(scoreId)
  if (!file) return new NextResponse('Fichier introuvable.', { status: 404 })
  return new NextResponse(file.data, {
    headers: { 'Content-Type': file.mime, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}
