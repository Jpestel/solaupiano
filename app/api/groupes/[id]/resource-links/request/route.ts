import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendResourceLinkRequest } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)

  const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } })
  if (!membership && session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const { activateIds, deactivateIds, message } = await req.json()
  const aIds = Array.isArray(activateIds) ? activateIds.map(Number) : []
  const dIds = Array.isArray(deactivateIds) ? deactivateIds.map(Number) : []
  if (aIds.length === 0 && dIds.length === 0) {
    return NextResponse.json({ error: 'Sélectionnez au moins un lien.' }, { status: 400 })
  }

  const [group, requester, links, admins] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.resourceLink.findMany({ where: { id: { in: [...aIds, ...dIds] } }, select: { id: true, label: true } }),
    prisma.user.findMany({ where: { siteRole: 'ADMIN' }, select: { email: true } }),
  ])
  const labelOf = new Map(links.map((l) => [l.id, l.label]))
  const activate = aIds.map((id) => labelOf.get(id)).filter(Boolean) as string[]
  const deactivate = dIds.map((id) => labelOf.get(id)).filter(Boolean) as string[]

  try {
    await Promise.all(
      admins.filter((a) => a.email).map((a) =>
        sendResourceLinkRequest(a.email, {
          groupName: group?.name ?? 'Groupe',
          requesterName: requester?.name ?? 'Un membre',
          activate, deactivate,
          message: typeof message === 'string' ? message.trim().slice(0, 500) : undefined,
        })
      )
    )
  } catch (e) {
    console.error('resource link request mail', e)
    return NextResponse.json({ error: 'Envoi impossible.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
