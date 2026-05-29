import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — liste tous les tickets (admin)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // OPEN | IN_PROGRESS | CLOSED | null (= tous)

  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status: status as 'OPEN' | 'IN_PROGRESS' | 'CLOSED' } : {},
    orderBy: [{ isPriority: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ tickets })
}
