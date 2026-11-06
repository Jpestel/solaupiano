import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reprisesUser } from '@/lib/reprises'
import { newShareToken } from '@/lib/reprises-partage'

/** Body : { action: 'enable' | 'renew' | 'stop' } */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const score = await prisma.coverScore.findFirst({ where: { id: Number(params.id), userId: u.userId }, select: { id: true, shareToken: true } })
  if (!score) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const { action } = await req.json().catch(() => ({}))
  let shareToken: string | null
  if (action === 'stop') shareToken = null
  else if (action === 'renew') shareToken = newShareToken()
  else if (action === 'enable') shareToken = score.shareToken ?? newShareToken()
  else return NextResponse.json({ error: 'Action invalide.' }, { status: 400 })
  await prisma.coverScore.update({ where: { id: score.id }, data: { shareToken } })
  return NextResponse.json({ shareToken })
}
