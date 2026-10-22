import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AUDIT_RETENTION_DAYS } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const PAGE = 50

/**
 * Journal d'activité d'un groupe : qui a fait quoi, quand.
 * Réservé aux chefs du groupe (et à l'administrateur du site) : un musicien
 * ordinaire n'a pas à consulter ce que font les autres.
 *
 * Paramètres : `userId` (un auteur), `entity` (un type d'élément), `before`
 * (identifiant de la dernière ligne vue, pour charger la suite).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!isAdmin && membership?.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé aux chefs du groupe.' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams
  const authorId = Number(q.get('userId'))
  const entity = q.get('entity')
  const before = Number(q.get('before'))

  const where = {
    groupId,
    ...(Number.isInteger(authorId) && authorId > 0 ? { userId: authorId } : {}),
    ...(entity ? { entityType: entity } : {}),
    ...(Number.isInteger(before) && before > 0 ? { id: { lt: before } } : {}),
  }

  const rows = await prisma.groupActivity.findMany({
    where,
    orderBy: { id: 'desc' },
    take: PAGE + 1,
    select: { id: true, createdAt: true, userId: true, actorName: true, action: true, entityType: true, summary: true },
  })
  const hasMore = rows.length > PAGE
  const items = hasMore ? rows.slice(0, PAGE) : rows

  // Les auteurs présents dans ce journal, pour le filtre (un ancien membre y reste visible).
  const authors = await prisma.groupActivity.groupBy({
    by: ['userId', 'actorName'],
    where: { groupId },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: 'desc' } },
  })

  return NextResponse.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
    authors: authors.map((a) => ({ userId: a.userId, name: a.actorName })),
    retentionDays: AUDIT_RETENTION_DAYS,
  })
}
