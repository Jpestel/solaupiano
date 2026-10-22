import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coChefCanDo } from '@/lib/permissions'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const rehearsalId = Number(params.id)
  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: Number(session.user.id), groupId: rehearsal.groupId } },
  })
  if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const attendances = await prisma.attendance.findMany({
    where: { rehearsalId },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json(attendances)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { status } = await req.json()
  const validStatuses = ['PRESENT', 'ABSENT', 'INCERTAIN']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }

  const attendance = await prisma.attendance.upsert({
    where: { userId_rehearsalId: { userId, rehearsalId } },
    update: { status },
    create: { userId, rehearsalId, status },
  })

  // Si le musicien n'est plus présent, son auto-évaluation ne doit pas fausser
  // les résultats → on la supprime (cascade sur notes membres/morceaux).
  if (status !== 'PRESENT') {
    await prisma.rehearsalEvaluation.deleteMany({ where: { rehearsalId, evaluatorId: userId } })
  }

  return NextResponse.json(attendance)
}

/**
 * Ajoute un membre du groupe à une répétition existante (le chef, ou un co-chef
 * autorisé à modifier les répétitions).
 *
 * Aucune restriction de date : on peut ajouter quelqu'un APRÈS la répétition,
 * typiquement pour enregistrer après coup qu'il était là (ou oublié à la
 * création). Le statut peut alors être fixé directement.
 *
 * Aucun e-mail n'est envoyé : ajouter quelqu'un à une répétition passée ne doit
 * pas lui écrire « nouvelle répétition ».
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const isAdmin = session.user.siteRole === 'ADMIN'
  const rehearsalId = Number(params.id)

  const rehearsal = await prisma.rehearsal.findUnique({ where: { id: rehearsalId } })
  if (!rehearsal) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: rehearsal.groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }
  if (!isAdmin) {
    const grp = await prisma.group.findUnique({ where: { id: rehearsal.groupId }, select: { createdBy: true, chefPermissions: true } })
    if (grp && !coChefCanDo(grp, userId, isAdmin, 'repetitions', 'update')) {
      return NextResponse.json({ error: 'Action non autorisée par le fondateur du groupe.' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const targetId = Number(body.userId)
  const status = body.status ?? 'EN_ATTENTE'
  if (!Number.isInteger(targetId)) return NextResponse.json({ error: 'Membre invalide.' }, { status: 400 })
  if (!['EN_ATTENTE', 'PRESENT', 'ABSENT', 'INCERTAIN'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }

  // La personne ajoutée doit faire partie du groupe de la répétition.
  const target = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetId, groupId: rehearsal.groupId } },
    include: { user: { select: { id: true, name: true } } },
  })
  if (!target) return NextResponse.json({ error: "Cette personne ne fait pas partie du groupe." }, { status: 400 })

  const existing = await prisma.attendance.findUnique({
    where: { userId_rehearsalId: { userId: targetId, rehearsalId } },
  })
  if (existing) return NextResponse.json({ error: 'Cette personne est déjà dans la liste.' }, { status: 409 })

  const attendance = await prisma.attendance.create({
    data: { userId: targetId, rehearsalId, status },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json(attendance, { status: 201 })
}
