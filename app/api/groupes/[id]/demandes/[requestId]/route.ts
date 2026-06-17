import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendGroupWelcomeEmail } from '@/lib/email'

// PATCH — chef accepts or rejects a join request
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const requestId = Number(params.requestId)

  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!membership || membership.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { status } = await req.json()
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
  }

  const joinRequest = await prisma.joinRequest.findUnique({
    where: { id: requestId },
  })
  if (!joinRequest || joinRequest.groupId !== groupId) {
    return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  }

  await prisma.joinRequest.update({ where: { id: requestId }, data: { status } })

  if (status === 'ACCEPTED') {
    const requester = await prisma.user.findUnique({ where: { id: joinRequest.userId } })
    if (requester?.siteRole === 'ADMIN') {
      return NextResponse.json({ error: 'L\'administrateur ne peut pas rejoindre un groupe.' }, { status: 400 })
    }

    // Check member limit before accepting
    const grp = await prisma.group.findUnique({
      where: { id: groupId },
      select: { plan: true, maxMembersOverride: true },
    })
    if (grp) {
      const plan = await prisma.plan.findUnique({ where: { key: grp.plan }, select: { maxMembersPerGroup: true } })
      const effectiveLimit = grp.maxMembersOverride ?? plan?.maxMembersPerGroup ?? null
      if (effectiveLimit !== null) {
        const currentCount = await prisma.groupMember.count({ where: { groupId } })
        if (currentCount >= effectiveLimit) {
          return NextResponse.json({
            error: `Limite de membres atteinte (${currentCount}/${effectiveLimit}). Augmentez la limite ou retirez des membres avant d'accepter.`,
          }, { status: 409 })
        }
      }
    }

    await prisma.groupMember.create({
      data: { userId: joinRequest.userId, groupId, groupRole: 'MEMBRE' },
    })

    // Send welcome email
    if (requester) {
      const [group, chef] = await Promise.all([
        prisma.group.findUnique({ where: { id: groupId }, select: { name: true, type: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      ])
      const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
      if (group && chef) {
        sendGroupWelcomeEmail(requester.email, requester.name, group.name, groupId, chef.name, baseUrl, group.type).catch(() => {})
      }
    }
  }

  return NextResponse.json({ success: true })
}
