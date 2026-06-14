import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Une bulle de groupe a un chemin /groupes/<id>[/sous-page]. On peut la répliquer
// sur la page équivalente d'autres groupes.
const GROUP_PATH = /^\/groupes\/(\d+)(\/.*)?$/

// GET — (admin) infos pour la réplication : sous-page + groupes cibles disponibles.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const bubble = await prisma.helpBubble.findUnique({ where: { id: Number(params.id) } })
  if (!bubble) return NextResponse.json({ error: 'Bulle introuvable.' }, { status: 404 })

  const m = bubble.path.match(GROUP_PATH)
  if (!m) return NextResponse.json({ replicable: false, groups: [] })
  const sourceGroupId = Number(m[1])
  const subPath = m[2] || ''

  const groups = await prisma.group.findMany({
    where: { id: { not: sourceGroupId } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ replicable: true, sourceGroupId, subPath, groups })
}

// POST — (admin) duplique la bulle sur les groupes choisis (page équivalente).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const bubble = await prisma.helpBubble.findUnique({ where: { id: Number(params.id) } })
  if (!bubble) return NextResponse.json({ error: 'Bulle introuvable.' }, { status: 404 })

  const m = bubble.path.match(GROUP_PATH)
  if (!m) return NextResponse.json({ error: "Cette bulle n'est pas sur une page de groupe." }, { status: 400 })
  const sourceGroupId = Number(m[1])
  const subPath = m[2] || ''
  // Réécrit l'id du groupe dans le sélecteur d'ancrage (ex. a[href="/groupes/29/..."] → groupe cible)
  const rewriteSelector = (sel: string | null, targetId: number): string | null =>
    sel ? sel.replaceAll(`/groupes/${sourceGroupId}`, `/groupes/${targetId}`) : sel

  const body = await req.json().catch(() => ({}))
  const groupIds: number[] = Array.isArray(body.groupIds)
    ? Array.from(new Set(body.groupIds.map((x: unknown) => Number(x)).filter((n: number) => Number.isInteger(n))))
    : []
  if (groupIds.length === 0) return NextResponse.json({ error: 'Aucun groupe sélectionné.' }, { status: 400 })

  // Ne cible que des groupes réels
  const valid = await prisma.group.findMany({ where: { id: { in: groupIds } }, select: { id: true } })
  const validIds = valid.map((g) => g.id)

  let created = 0
  let skipped = 0
  for (const gid of validIds) {
    const targetPath = `/groupes/${gid}${subPath}`
    // Idempotent : on évite de recréer une bulle identique déjà présente sur cette page
    const dup = await prisma.helpBubble.findFirst({ where: { path: targetPath, title: bubble.title, content: bubble.content } })
    if (dup) { skipped++; continue }
    await prisma.helpBubble.create({
      data: {
        path: targetPath,
        xPct: bubble.xPct,
        yPx: bubble.yPx,
        anchorSelector: rewriteSelector(bubble.anchorSelector, gid),
        anchorDx: bubble.anchorDx,
        anchorDy: bubble.anchorDy,
        title: bubble.title,
        content: bubble.content,
        emoji: bubble.emoji,
        color: bubble.color,
        audience: bubble.audience,
        active: bubble.active,
      },
    })
    created++
  }
  return NextResponse.json({ created, skipped })
}
