import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const songId = Number(params.id)
  const body = await req.json()

  // On accepte un pourcentage (0..100) et/ou un statut. Le statut est dérivé du %.
  const statusToPercent: Record<string, number> = { A_TRAVAILLER: 0, EN_COURS: 50, MAITRISE: 100 }
  let percent: number
  if (typeof body.percent === 'number' && isFinite(body.percent)) {
    percent = Math.max(0, Math.min(100, Math.round(body.percent)))
  } else {
    percent = statusToPercent[body.status] ?? 0
  }
  const status = percent >= 100 ? 'MAITRISE' : percent <= 0 ? 'A_TRAVAILLER' : 'EN_COURS'

  const result = await prisma.userSongProgress.upsert({
    where: { userId_songId: { userId, songId } },
    update: { status, percent },
    create: { userId, songId, status, percent },
  })

  return NextResponse.json(result)
}
