import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })

  try {
    const instrument = await prisma.instrument.update({
      where: { id: Number(params.id) },
      data: { name: name.trim() },
    })
    return NextResponse.json(instrument)
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Ce nom est déjà utilisé.' }, { status: 409 })
    if (e.code === 'P2025') return NextResponse.json({ error: 'Instrument introuvable.' }, { status: 404 })
    throw e
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.instrument.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
