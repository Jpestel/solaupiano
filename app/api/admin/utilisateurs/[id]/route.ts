import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlinkPublicFile } from '@/lib/file-cleanup'
import { setUserPlan } from '@/lib/user-plan'
import { setUserTestFlag } from '@/lib/test-data'

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
  const { siteRole, name, email, password, instrumentIds, accountPlan, planExpiresAt, adminLoginAlertEnabled, isTest } = body
  const targetId = Number(params.id)

  // Statut « compte de test » (se répercute sur isTest de tous ses groupes fondés).
  if (isTest !== undefined) {
    await setUserTestFlag(targetId, Boolean(isTest))
  }

  // Plan du compte (se répercute sur tous les groupes fondés par l'utilisateur).
  if (accountPlan !== undefined) {
    try {
      await setUserPlan(targetId, String(accountPlan), planExpiresAt ? new Date(planExpiresAt) : null)
    } catch {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
    }
  }

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

  if (password !== undefined && password !== '') {
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    }
    data.password = await bcrypt.hash(password, 12)
  }

  if (adminLoginAlertEnabled !== undefined) {
    data.adminLoginAlertEnabled = Boolean(adminLoginAlertEnabled)
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data,
    select: { id: true, name: true, email: true, siteRole: true, accountPlan: true, adminLoginAlertEnabled: true, isTest: true },
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
    select: { siteRole: true, avatarUrl: true, _count: { select: { groups: true } } },
  })

  if (!target) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 })
  if (target.siteRole === 'ADMIN') {
    return NextResponse.json({ error: 'Impossible de supprimer un administrateur.' }, { status: 400 })
  }
  if (target._count.groups > 0) {
    return NextResponse.json({ error: 'Cet utilisateur est membre d\'un groupe. Retirez-le de ses groupes avant de le supprimer.' }, { status: 400 })
  }

  if (target.avatarUrl) unlinkPublicFile(target.avatarUrl)
  await prisma.user.delete({ where: { id: targetId } })

  return NextResponse.json({ success: true })
}
