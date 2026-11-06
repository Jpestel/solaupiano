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
    const adminOpen = session.user.siteRole === 'ADMIN' && MODULES.some((m) => m.key === key && m.closedByDefault)
    return NextResponse.json({ allowed: adminOpen || await hasModuleAccess(userId, key) })
  }

  const access = await moduleAccessMap(userId, MODULES.map((m) => m.key))
  const isAdmin = session.user.siteRole === 'ADMIN'
  // L'admin garde accès aux modules fermés par défaut (pour les tester).
  const closed = new Set(MODULES.filter((m) => m.closedByDefault).map((m) => m.key))
  return NextResponse.json({ blocked: Object.keys(access).filter((k) => !access[k] && !(isAdmin && closed.has(k))) })
}
