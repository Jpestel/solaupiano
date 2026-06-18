import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEmailTemplate } from '@/lib/get-email-template'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { name, email, message, concertId, _hp } = await req.json()

  // Honeypot anti-spam
  if (_hp) return NextResponse.json({ ok: true })

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message trop long (2000 caractères max).' }, { status: 400 })
  }

  const page = await prisma.groupPage.findUnique({
    where: { slug: params.slug },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          members: {
            where: { groupRole: 'CHEF' },
            include: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  })

  if (!page || !page.published) {
    return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })
  }

  const chefs = page.group.members.map(m => m.user)
  if (chefs.length === 0) return NextResponse.json({ ok: true })

  const groupName = page.group.name
  const parsedConcertId = Number(concertId)
  const concert = Number.isFinite(parsedConcertId)
    ? await prisma.concert.findFirst({
      where: { id: parsedConcertId, groupId: page.group.id, isPublic: true },
      select: { name: true, date: true, location: true, address: true, postalCode: true, city: true, startTime: true },
    })
    : null

  const tpl = await getEmailTemplate('group_page_contact')
  const { subject, introHtml, outroHtml } = tpl.render({
    senderName: name,
    senderEmail: email,
    groupName,
  })
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message)
  const safeSubject = concert ? `${subject} - ${concert.name}` : subject
  const concertAddress = concert
    ? [
      concert.location,
      concert.address,
      [concert.postalCode, concert.city].filter(Boolean).join(' '),
    ].filter(Boolean).join(', ')
    : ''

  await Promise.all(chefs.map(chef =>
    resend.emails.send({
      from: 'Sol au piano <noreply@solaupiano.fr>',
      to: chef.email,
      replyTo: email,
      subject: safeSubject,
      html: `
        <div style="font-family:-apple-system,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#f9fafb;">
          <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            ${introHtml}

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 4px;font-size:13px;"><strong>Nom :</strong> ${safeName}</p>
              <p style="margin:0;font-size:13px;"><strong>Email :</strong> <a href="mailto:${safeEmail}" style="color:#4f46e5;">${safeEmail}</a></p>
            </div>

            ${concert ? `
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#9a3412;">Question sur le concert</p>
                <p style="margin:0 0 4px;font-size:14px;color:#111827;"><strong>${escapeHtml(page.group.name)}</strong> en concert ici</p>
                <p style="margin:0 0 4px;font-size:13px;color:#4b5563;">${escapeHtml(concertAddress)}</p>
                <p style="margin:0;font-size:13px;color:#7c2d12;">${escapeHtml(formatDate(concert.date))}${concert.startTime ? `, à partir de ${escapeHtml(concert.startTime)}` : ''}</p>
              </div>
            ` : ''}

            <div style="background:#f0f4ff;border-left:4px solid #4f46e5;border-radius:4px;padding:16px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
            </div>

            <div style="margin:24px 0;text-align:center;">
              <a href="mailto:${safeEmail}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;">
                Répondre à ${safeName} →
              </a>
            </div>

            ${outroHtml}
          </div>
        </div>`,
    })
  ))

  return NextResponse.json({ ok: true })
}
