import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  const { ids } = await req.json()
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids requis.' }, { status: 400 })

  await prisma.$transaction(
    ids.map((id: number, index: number) =>
      prisma.homeSlide.update({ where: { id: Number(id) }, data: { sortOrder: index } })
    )
  )
  return NextResponse.json({ ok: true })
}
