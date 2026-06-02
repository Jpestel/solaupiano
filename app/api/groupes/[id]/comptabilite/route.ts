import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}
const round2 = (n: number) => Math.round(n * 100) / 100

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!isAdmin && !membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const [expenses, members] = await Promise.all([
    prisma.groupExpense.findMany({
      where: { groupId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        paidBy: { select: { id: true, name: true } },
        shares: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.groupMember.findMany({ where: { groupId }, include: { user: { select: { id: true, name: true } } }, orderBy: { joinedAt: 'asc' } }),
  ])

  // Bilan par membre : avancé (a payé pour le groupe) − dû (parts non encore réglées)
  const balance: Record<number, { name: string; advanced: number; owedOutstanding: number }> = {}
  for (const m of members) balance[m.userId] = { name: m.user.name, advanced: 0, owedOutstanding: 0 }
  let totalExpenses = 0, totalCollected = 0, totalOutstanding = 0
  for (const e of expenses) {
    totalExpenses += e.amount
    if (e.paidById && balance[e.paidById]) balance[e.paidById].advanced += e.amount
    for (const s of e.shares) {
      if (s.paid) totalCollected += s.amount
      else { totalOutstanding += s.amount; if (balance[s.userId]) balance[s.userId].owedOutstanding += s.amount }
    }
  }

  return NextResponse.json({
    isChef: isAdmin || membership?.groupRole === 'CHEF',
    members: members.map((m) => ({ userId: m.userId, name: m.user.name })),
    expenses,
    summary: {
      totalExpenses: round2(totalExpenses),
      totalCollected: round2(totalCollected),
      totalOutstanding: round2(totalOutstanding),
      balance: Object.entries(balance).map(([uid, v]) => ({ userId: Number(uid), name: v.name, advanced: round2(v.advanced), owedOutstanding: round2(v.owedOutstanding) })),
    },
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!isAdmin && membership?.groupRole !== 'CHEF') return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })

  const { title, description, amount, date, period, category, paidById, splitMode, memberIds, customShares } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
  const total = round2(Number(amount))
  if (!(total > 0)) return NextResponse.json({ error: 'Le montant doit être supérieur à 0.' }, { status: 400 })
  const d = toDate(String(date || '')) || new Date()

  // Membres du groupe (pour valider les parts)
  const groupMembers = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })
  const validIds = new Set(groupMembers.map((m) => m.userId))
  const payer = paidById && validIds.has(Number(paidById)) ? Number(paidById) : null

  // Construction des parts
  let shares: { userId: number; amount: number }[] = []
  if (splitMode === 'custom' && Array.isArray(customShares)) {
    shares = customShares
      .map((s: any) => ({ userId: Number(s.userId), amount: round2(Number(s.amount)) }))
      .filter((s) => validIds.has(s.userId) && s.amount > 0)
  } else {
    const ids: number[] = (Array.isArray(memberIds) && memberIds.length > 0 ? memberIds.map(Number) : Array.from(validIds)).filter((i) => validIds.has(i))
    if (ids.length === 0) return NextResponse.json({ error: 'Sélectionnez au moins un membre.' }, { status: 400 })
    const base = Math.floor((total / ids.length) * 100) / 100
    shares = ids.map((uid, i) => ({ userId: uid, amount: i === ids.length - 1 ? round2(total - base * (ids.length - 1)) : base }))
  }
  if (shares.length === 0) return NextResponse.json({ error: 'Répartition invalide.' }, { status: 400 })

  const expense = await prisma.groupExpense.create({
    data: {
      groupId, title: title.trim().slice(0, 191), description: description?.trim() || null,
      amount: total, date: d, period: period?.trim()?.slice(0, 80) || null, category: category?.trim()?.slice(0, 60) || null,
      paidById: payer, createdById: userId,
      shares: {
        create: shares.map((s) => ({
          userId: s.userId, amount: s.amount,
          // La part de celui qui a avancé est considérée comme déjà réglée
          paid: payer != null && s.userId === payer,
          paidAt: payer != null && s.userId === payer ? new Date() : null,
        })),
      },
    },
  })
  return NextResponse.json(expense, { status: 201 })
}
