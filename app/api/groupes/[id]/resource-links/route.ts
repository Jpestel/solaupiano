import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveResourceLinks } from '@/lib/resource-links-server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const groupId = Number(params.id)
  if (session.user.siteRole !== 'ADMIN') {
    const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: Number(session.user.id), groupId } } })
    if (!m) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const links = await getEffectiveResourceLinks(groupId)
  return NextResponse.json(links)
}
