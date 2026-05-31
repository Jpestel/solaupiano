import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSupportReply } from '@/lib/email'

// PATCH — mettre à jour statut / note admin
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  const id = Number(params.id)
  const body = await req.json()
  const { status, adminNote, notify } = body

  // Récupère l'état précédent pour détecter une nouvelle réponse
  const previous = await prisma.supportTicket.findUnique({ where: { id } })

  const data: Record<string, unknown> = {}
  if (status !== undefined) data.status = status
  if (adminNote !== undefined) data.adminNote = adminNote

  const ticket = await prisma.supportTicket.update({ where: { id }, data })

  // Notifie l'utilisateur par email si la réponse admin a changé (sauf si notify === false)
  const replyChanged = adminNote !== undefined && adminNote?.trim() && adminNote !== previous?.adminNote
  if (replyChanged && notify !== false && ticket.userEmail) {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://solaupiano.fr'
    sendSupportReply(ticket.userEmail, ticket.userName, {
      id: ticket.id,
      subject: ticket.subject,
      reply: adminNote,
    }, baseUrl).catch(() => {})
  }

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
