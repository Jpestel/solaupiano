import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendGroupWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  const userId = Number(session.user.id)

  const isAdmin = session.user.siteRole === 'ADMIN'
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && (!membership || membership.groupRole !== 'CHEF')) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'L\'email est requis.' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!target) return NextResponse.json({ error: 'Aucun compte trouvé avec cet email.' }, { status: 404 })
  if (target.siteRole === 'ADMIN') return NextResponse.json({ error: 'L\'administrateur du site ne peut pas être membre d\'un groupe.' }, { status: 400 })

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: target.id, groupId } },
  })
  if (existing) return NextResponse.json({ error: 'Ce musicien est déjà membre du groupe.' }, { status: 409 })

  const [group] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.groupMember.create({ data: { userId: target.id, groupId, groupRole: 'MEMBRE' } }),
  ])

  const adder = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  if (group && adder) {
    sendGroupWelcomeEmail(target.email, target.name, group.name, groupId, adder.name, baseUrl).catch(() => {})
  }

  return NextResponse.json({ success: true, name: target.name })
}
