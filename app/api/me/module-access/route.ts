import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasModuleAccess } from '@/lib/module-access'

export const dynamic = 'force-dynamic'

// Renvoie si l'utilisateur courant a accès à un module (clé ?key=tool_xxx)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ allowed: false }, { status: 401 })

  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key requis' }, { status: 400 })

  const allowed = await hasModuleAccess(Number(session.user.id), key)
  return NextResponse.json({ allowed })
}
