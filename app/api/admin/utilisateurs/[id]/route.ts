import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  return null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const err = await requireAdmin(session)
  if (err) return err

  const body = await req.json()
  const { siteRole, name, email, instrumentIds } = body
  const targetId = Number(params.id)

  const data: Record<string, unknown> = {}

  if (siteRole !== undefined) {
    if (!['ADMIN', 'USER'].includes(siteRole)) {
      return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
    }
    data.siteRole = siteRole
  }

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 })
    data.name = name.trim()
  }

  if (email !== undefined) {
    if (!email.trim()) return NextResponse.json({ error: 'L\'email est requis.' }, { status: 400 })
    const existing = await prisma.user.findFirst({
      where: { email: email.trim(), NOT: { id: targetId } },
    })
    if (existing) return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 400 })
    data.email = email.trim()
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data,
    select: { id: true, name: true, email: true, siteRole: true },
  })

  if (Array.isArray(instrumentIds)) {
    await prisma.userInstrument.deleteMany({ where: { userId: targetId } })
    if (instrumentIds.length > 0) {
      await prisma.userInstrument.createMany({
        data: instrumentIds.map((id: number) => ({ userId: targetId, instrumentId: id })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json(user)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const err = await requireAdmin(session)
  if (err) return err

  const targetId = Number(params.id)

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { siteRole: true, _count: { select: { groups: true } } },
  })

  if (!target) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  if (target.siteRole === 'ADMIN') {
    return NextResponse.json({ error: 'Impossible de supprimer un administrateur.' }, { status: 400 })
  }
  if (target._count.groups > 0) {
    return NextResponse.json({ error: 'Cet utilisateur est membre d\'un groupe. Retirez-le de ses groupes avant de le supprimer.' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: targetId } })

  return NextResponse.json({ success: true })
}
