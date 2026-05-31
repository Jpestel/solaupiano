import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { intervalToMs } from '@/lib/flash-info'

export const dynamic = 'force-dynamic'

// Renvoie le prochain flash info à afficher à l'utilisateur courant (ou null).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ flash: null })
  const userId = Number(session.user.id)
  const now = new Date()

  const candidates = await prisma.flashInfo.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    include: { views: { where: { userId } } },
  })

  for (const f of candidates) {
    const v = f.views[0]
    if (!v) {
      // jamais vu → éligible
      return NextResponse.json({ flash: pick(f) })
    }
    if (!f.recurring) continue // déjà vu une fois et non récurrent
    if (f.maxDisplays != null && v.count >= f.maxDisplays) continue
    const elapsed = now.getTime() - new Date(v.lastSeenAt).getTime()
    if (elapsed >= intervalToMs(f.intervalValue, f.intervalUnit)) {
      return NextResponse.json({ flash: pick(f) })
    }
  }

  return NextResponse.json({ flash: null })
}

function pick(f: { id: number; type: string; title: string; content: string; ctaLabel: string | null; ctaUrl: string | null }) {
  return { id: f.id, type: f.type, title: f.title, content: f.content, ctaLabel: f.ctaLabel, ctaUrl: f.ctaUrl }
}
