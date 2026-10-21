import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasModuleAccess, moduleAccessMap } from '@/lib/module-access'
import { MODULES } from '@/lib/modules'

export const dynamic = 'force-dynamic'

/**
 * Accès de l'utilisateur courant aux modules.
 *  - `?key=tool_xxx` : { allowed } pour ce module ;
 *  - sans `key`      : { blocked: [...] }, la liste des modules qui lui sont
 *    fermés, pour que le menu les masque au lieu de laisser un lien qui renvoie
 *    vers un message d'erreur.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ allowed: false, blocked: [] }, { status: 401 })

  const userId = Number(session.user.id)
  const key = req.nextUrl.searchParams.get('key')

  if (key) {
    return NextResponse.json({ allowed: await hasModuleAccess(userId, key) })
  }

  const access = await moduleAccessMap(userId, MODULES.map((m) => m.key))
  return NextResponse.json({ blocked: Object.keys(access).filter((k) => !access[k]) })
}
