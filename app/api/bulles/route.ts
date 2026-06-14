import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ALLOWED_COLORS = ['indigo', 'amber', 'green', 'sky', 'rose', 'purple']
const ALLOWED_AUDIENCES = ['ALL', 'MEMBERS', 'CHEFS', 'ADMINS']
function clampPct(v: unknown): number {
  const n = Number(v)
  if (!isFinite(n)) return 50
  return Math.max(0, Math.min(100, n))
}

// GET /api/bulles?path=/groupes/3   → bulles actives visibles par l'utilisateur pour ce chemin
// GET /api/bulles?all=1             → toutes les bulles (admin) pour la gestion
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json([], { status: 200 }) // pas connecté : aucune bulle
  const isAdmin = session.user.siteRole === 'ADMIN'
  const { searchParams } = new URL(req.url)

  if (searchParams.get('all')) {
    if (!isAdmin) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    const bubbles = await prisma.helpBubble.findMany({
      orderBy: [{ path: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { dismissals: true } } },
    })
    return NextResponse.json(bubbles.map(({ _count, ...b }) => ({ ...b, dismissedCount: _count.dismissals })))
  }

  const path = searchParams.get('path')
  if (!path) return NextResponse.json([], { status: 200 })

  const all = await prisma.helpBubble.findMany({ where: { path, active: true }, orderBy: { createdAt: 'asc' } })

  // En mode édition (admin), on renvoie tout pour ce chemin (le filtre d'audience est ignoré
  // côté admin afin qu'il puisse tout voir/éditer). Le composant gère l'affichage.
  if (isAdmin && searchParams.get('edit')) return NextResponse.json(all)

  // Filtre d'audience + exclusion des bulles que l'utilisateur a masquées individuellement.
  const userId = Number(session.user.id)
  const dismissedRows = await prisma.helpBubbleDismissal.findMany({
    where: { userId, bubbleId: { in: all.map((b) => b.id) } },
    select: { bubbleId: true },
  })
  const dismissedSet = new Set(dismissedRows.map((d) => d.bubbleId))
  let isChef = false
  if (all.some((b) => b.audience === 'CHEFS')) {
    const chefCount = await prisma.groupMember.count({ where: { userId, groupRole: 'CHEF' } })
    const foundedCount = await prisma.group.count({ where: { createdBy: userId } })
    isChef = chefCount > 0 || foundedCount > 0
  }

  const visible = all.filter((b) => {
    if (dismissedSet.has(b.id)) return false
    switch (b.audience) {
      case 'ADMINS': return isAdmin
      case 'MEMBERS': return !isAdmin
      case 'CHEFS': return isChef || isAdmin
      case 'ALL':
      default: return true
    }
  })
  return NextResponse.json(visible)
}

// POST /api/bulles  (admin) — crée une bulle
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const b = await req.json().catch(() => ({}))

  const path = String(b.path || '').trim()
  if (!path) return NextResponse.json({ error: 'Chemin manquant.' }, { status: 400 })
  const title = String(b.title || '').slice(0, 120)
  const content = String(b.content || '').slice(0, 2000)
  if (!title.trim() && !content.trim()) return NextResponse.json({ error: 'Ajoutez un titre ou un texte.' }, { status: 400 })

  const bubble = await prisma.helpBubble.create({
    data: {
      path,
      xPct: clampPct(b.xPct),
      yPx: Math.max(0, Math.round(Number(b.yPx) || 0)),
      title,
      content,
      emoji: String(b.emoji || '💡').slice(0, 8),
      color: ALLOWED_COLORS.includes(b.color) ? b.color : 'indigo',
      audience: ALLOWED_AUDIENCES.includes(b.audience) ? b.audience : 'ALL',
      active: b.active !== false,
    },
  })
  return NextResponse.json(bubble, { status: 201 })
}
