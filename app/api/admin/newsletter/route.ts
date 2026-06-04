import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendNewsletterToSubscribers } from '@/lib/email'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const [newsletters, activeCount, totalCount] = await Promise.all([
    prisma.newsletter.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.newsletterSubscriber.count({ where: { active: true } }),
    prisma.newsletterSubscriber.count(),
  ])
  return NextResponse.json({ newsletters, activeCount, totalCount })
}

// Crée et envoie immédiatement une newsletter (ou enregistre un brouillon)
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const { subject, content, send } = await req.json()
  if (!subject?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Sujet et contenu requis.' }, { status: 400 })
  }

  // Contenu : si pas de HTML détecté, on convertit les retours à la ligne
  const raw = String(content)
  const html = /<[a-z][\s\S]*>/i.test(raw)
    ? raw
    : raw.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px; font-size:15px; line-height:1.6; color:#374151;">${p.replace(/\n/g, '<br>')}</p>`).join('')

  if (!send) {
    const nl = await prisma.newsletter.create({ data: { subject: subject.trim(), content: html, status: 'DRAFT' } })
    return NextResponse.json({ ok: true, newsletter: nl })
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { active: true },
    select: { email: true, token: true },
  })

  const count = await sendNewsletterToSubscribers(subject.trim(), html, subscribers)

  const nl = await prisma.newsletter.create({
    data: { subject: subject.trim(), content: html, status: 'SENT', sentAt: new Date(), recipientCount: count },
  })

  return NextResponse.json({ ok: true, sent: count, newsletter: nl })
}
