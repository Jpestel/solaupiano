import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const rider = await prisma.techRider.findUnique({
    where: { shareToken: params.token },
    include: { group: { select: { name: true } } },
  })

  if (!rider) return NextResponse.json({ error: 'Fiche introuvable.' }, { status: 404 })

  return NextResponse.json({
    groupName: rider.group.name,
    content: rider.content,
    updatedAt: rider.updatedAt,
  })
}
