import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSupportTicketToAdmin, sendSupportConfirmationToUser } from '@/lib/email'

// POST — soumettre un ticket
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { subject, message, category } = await req.json()
  if (!subject?.trim() || !message?.trim() || !category) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const userId = Number(session.user.id)

  // Vérifier si l'utilisateur est chef d'un groupe avec plan supportant la priorité
  const chefGroups = await prisma.groupMember.findMany({
    where: { userId, groupRole: 'CHEF' },
    select: { group: { select: { plan: true } } },
  })
  const planKeys = Array.from(new Set(chefGroups.map(m => m.group.plan)))
  const priorityPlan = planKeys.length > 0
    ? await prisma.plan.findFirst({ where: { key: { in: planKeys }, hasPrioritySupport: true } })
    : null
  const isPriority = !!priorityPlan

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      userName: session.user.name ?? 'Utilisateur',
      userEmail: session.user.email ?? '',
      subject: subject.trim(),
      message: message.trim(),
      category,
      isPriority,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://solaupiano.fr'

  // Notifier l'admin
  const admin = await prisma.user.findFirst({ where: { siteRole: 'ADMIN' }, select: { email: true } })
  if (admin) {
    await sendSupportTicketToAdmin(admin.email, {
      id: ticket.id,
      userName: ticket.userName,
      userEmail: ticket.userEmail,
      subject: ticket.subject,
      message: ticket.message,
      category: ticket.category,
      isPriority: ticket.isPriority,
    }, baseUrl).catch(() => {})
  }

  // Confirmer à l'utilisateur
  await sendSupportConfirmationToUser(ticket.userEmail, ticket.userName, {
    id: ticket.id,
    subject: ticket.subject,
    isPriority: ticket.isPriority,
  }, baseUrl).catch(() => {})

  return NextResponse.json({ ticket })
}

// GET — tickets de l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: Number(session.user.id) },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ tickets })
}
