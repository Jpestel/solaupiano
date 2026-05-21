import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { plan } = await req.json()
  const validPlans = ['FREE', 'PRO', 'PREMIUM']
  if (!validPlans.includes(plan)) return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })

  const group = await prisma.group.update({
    where: { id: Number(params.id) },
    data: { plan },
  })
  return NextResponse.json(group)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.group.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
