import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPlaceholderOverrides, setPlaceholderOverride } from '@/lib/placeholders-server'
import { PLACEHOLDER_DEFAULTS } from '@/lib/placeholders'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const overrides = await getPlaceholderOverrides()
  return NextResponse.json({ overrides })
}

// PATCH : { key, value } pour une entrée, ou { updates: { key: value } } en lot.
// value vide ou null => retour au défaut.
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))

  const apply = async (key: string, value: string | null) => {
    if (!(key in PLACEHOLDER_DEFAULTS)) return
    // Si la valeur == défaut, on supprime la surcharge (inutile de stocker)
    const v = typeof value === 'string' ? value : ''
    await setPlaceholderOverride(key, v === PLACEHOLDER_DEFAULTS[key] ? null : v)
  }

  if (b.updates && typeof b.updates === 'object') {
    for (const [k, v] of Object.entries(b.updates as Record<string, unknown>)) {
      await apply(k, typeof v === 'string' ? v : null)
    }
  } else if (typeof b.key === 'string') {
    await apply(b.key, typeof b.value === 'string' ? b.value : null)
  } else {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
