import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH — mettre à jour statut / note admin
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const id = Number(params.id)
  const body = await req.json()
  const { status, adminNote } = body

  const data: Record<string, unknown> = {}
  if (status !== undefined) data.status = status
  if (adminNote !== undefined) data.adminNote = adminNote

  const ticket = await prisma.supportTicket.update({ where: { id }, data })
  return NextResponse.json({ ticket })
}

// DELETE — supprimer un ticket (admin)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  await prisma.supportTicket.delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ ok: true })
}
