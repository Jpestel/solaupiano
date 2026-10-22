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
 * (curseur renvoyé par la page précédente, pour charger la suite).
 *
 * Tri par date : une ligne « remise à l'heure » (modifications répétées regroupées)
 * peut être plus récente qu'une ligne d'identifiant plus grand. Le curseur combine
 * donc la date et l'identifiant, sans quoi la pagination sauterait ou répéterait des lignes.
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
  // Curseur « <millisecondes>_<id> » : on repart juste après cette ligne dans l'ordre (date, id) décroissant.
  const m = /^(\d+)_(\d+)$/.exec(q.get('before') ?? '')
  const cursor = m ? { at: new Date(Number(m[1])), id: Number(m[2]) } : null

  const where = {
    groupId,
    ...(Number.isInteger(authorId) && authorId > 0 ? { userId: authorId } : {}),
    ...(entity ? { entityType: entity } : {}),
    ...(cursor ? { OR: [{ createdAt: { lt: cursor.at } }, { createdAt: cursor.at, id: { lt: cursor.id } }] } : {}),
  }

  const rows = await prisma.groupActivity.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
    nextCursor: hasMore ? `${items[items.length - 1].createdAt.getTime()}_${items[items.length - 1].id}` : null,
    authors: authors.map((a) => ({ userId: a.userId, name: a.actorName })),
    retentionDays: AUDIT_RETENTION_DAYS,
  })
}
