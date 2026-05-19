import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const error = await requireAdmin(session)
  if (error) return error

  const instruments = await prisma.instrument.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(instruments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const error = await requireAdmin(session)
  if (error) return error

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  try {
    const instrument = await prisma.instrument.create({ data: { name: name.trim() } })
    return NextResponse.json(instrument, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Cet instrument existe déjà.' }, { status: 409 })
    throw e
  }
}
