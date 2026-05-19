import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  if (session.user.siteRole !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { siteRole } = await req.json()
  const validRoles = ['ADMIN', 'USER']
  if (!validRoles.includes(siteRole)) {
    return NextResponse.json({ error: 'Rôle invalide.' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: Number(params.id) },
    data: { siteRole },
    select: { id: true, name: true, email: true, siteRole: true },
  })

  return NextResponse.json(user)
}
