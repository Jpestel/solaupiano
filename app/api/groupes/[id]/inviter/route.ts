import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const userId = Number(session.user.id)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!membership || membership.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'L\'email est requis.' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!target) return NextResponse.json({ error: 'Aucun compte trouvé avec cet email.' }, { status: 404 })

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: target.id, groupId } },
  })
  if (existing) return NextResponse.json({ error: 'Ce musicien est déjà membre du groupe.' }, { status: 409 })

  await prisma.groupMember.create({
    data: { userId: target.id, groupId, groupRole: 'MEMBRE' },
  })

  return NextResponse.json({ success: true, name: target.name })
}
