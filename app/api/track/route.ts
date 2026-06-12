import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveModule } from '@/lib/usage'

export const dynamic = 'force-dynamic'

// POST { path } — enregistre une visite de module pour l'utilisateur connecté.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const path = typeof body.path === 'string' ? body.path : ''
  if (!path) return NextResponse.json({ ok: false }, { status: 400 })

  const mod = resolveModule(path)
  if (!mod) return NextResponse.json({ ok: true, tracked: false })

  try {
    await prisma.moduleVisit.create({
      data: {
        userId: Number(session.user.id),
        path: path.slice(0, 500),
        moduleKey: mod.key,
        moduleLabel: mod.label,
      },
    })
  } catch {
    // l'audit ne doit jamais gêner l'utilisateur
  }
  return NextResponse.json({ ok: true, tracked: true })
}
