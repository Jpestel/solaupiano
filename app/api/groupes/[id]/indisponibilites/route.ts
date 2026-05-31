import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Normalise une chaîne 'YYYY-MM-DD' en Date (minuit UTC) pour un stockage @db.Date stable
function toDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

async function membership(userId: number, groupId: number, isAdmin: boolean) {
  if (isAdmin) return { ok: true, role: 'CHEF' as string | null }
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  return { ok: !!m, role: m?.groupRole ?? null }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const m = await membership(userId, groupId, isAdmin)
  if (!m.ok) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const items = await prisma.unavailability.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { startDate: 'asc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const m = await membership(userId, groupId, isAdmin)
  if (!m.ok) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { startDate, endDate, note } = await req.json()
  const start = toDate(String(startDate || ''))
  if (!start) return NextResponse.json({ error: 'Date de début invalide.' }, { status: 400 })
  let end = endDate ? toDate(String(endDate)) : start
  if (!end) return NextResponse.json({ error: 'Date de fin invalide.' }, { status: 400 })
  if (end < start) end = start

  const created = await prisma.unavailability.create({
    data: { userId, groupId, startDate: start, endDate: end, note: note?.trim()?.slice(0, 200) || null },
    include: { user: { select: { id: true, name: true } } },
  })
  return NextResponse.json(created, { status: 201 })
}
