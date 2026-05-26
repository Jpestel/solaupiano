import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const body = await req.json()
  const { plan, planExpiresAt, maxMembersOverride } = body

  // Vérifier que le plan existe en base
  if (plan) {
    const planExists = await prisma.plan.findUnique({ where: { key: plan } })
    if (!planExists) return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
  }

  // Validation de maxMembersOverride
  if (maxMembersOverride !== undefined && maxMembersOverride !== null) {
    const val = Number(maxMembersOverride)
    if (!Number.isInteger(val) || val < 1) {
      return NextResponse.json({ error: 'La limite de membres doit être un entier ≥ 1.' }, { status: 400 })
    }
  }

  const group = await prisma.group.update({
    where: { id: Number(params.id) },
    data: {
      ...(plan !== undefined && { plan }),
      ...(planExpiresAt !== undefined && {
        planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
      }),
      ...(maxMembersOverride !== undefined && {
        maxMembersOverride: maxMembersOverride !== null ? Number(maxMembersOverride) : null,
      }),
    },
  })
  return NextResponse.json({ ...group, storageUsedBytes: String(group.storageUsedBytes) })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.group.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
