import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  return null
}

const TYPES = ['INFO', 'ASTUCE', 'NEWS', 'ALERTE']
const UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH']
const toDateOrNull = (s: unknown) => (s ? new Date(String(s)) : null)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const err = await requireAdmin()
  if (err) return err
  const id = Number(params.id)
  const b = await req.json()

  const data: Record<string, unknown> = {}
  if (b.type !== undefined && TYPES.includes(b.type)) data.type = b.type
  if (b.title !== undefined) data.title = String(b.title).trim().slice(0, 191)
  if (b.content !== undefined) data.content = String(b.content).trim()
  if (b.ctaLabel !== undefined) data.ctaLabel = b.ctaLabel?.trim() || null
  if (b.ctaUrl !== undefined) data.ctaUrl = b.ctaUrl?.trim() || null
  if (b.active !== undefined) data.active = !!b.active
  if (b.startAt !== undefined) data.startAt = toDateOrNull(b.startAt)
  if (b.endAt !== undefined) data.endAt = toDateOrNull(b.endAt)
  if (b.recurring !== undefined) data.recurring = !!b.recurring
  if (b.intervalValue !== undefined) data.intervalValue = Math.max(1, Number(b.intervalValue) || 1)
  if (b.intervalUnit !== undefined && UNITS.includes(b.intervalUnit)) data.intervalUnit = b.intervalUnit
  if (b.maxDisplays !== undefined) data.maxDisplays = b.maxDisplays ? Math.max(1, Number(b.maxDisplays)) : null
  if (b.priority !== undefined) data.priority = Number(b.priority) || 0

  const updated = await prisma.flashInfo.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const err = await requireAdmin()
  if (err) return err
  await prisma.flashInfo.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}

// Réinitialise les vues (pour re-diffuser à tout le monde)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const err = await requireAdmin()
  if (err) return err
  await prisma.flashInfoView.deleteMany({ where: { flashInfoId: Number(params.id) } })
  return NextResponse.json({ success: true })
}
