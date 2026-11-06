import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reprisesUser } from '@/lib/reprises'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await reprisesUser()
  if (!u) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  await prisma.coverShare.deleteMany({ where: { id: Number(params.id), userId: u.userId } })
  return NextResponse.json({ ok: true })
}
