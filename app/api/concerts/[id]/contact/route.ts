import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

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

function fullAddress(concert: {
  location: string
  address: string | null
  postalCode: string | null
  city: string | null
}) {
  return [
    concert.location,
    concert.address,
    [concert.postalCode, concert.city].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, email, message, _hp } = await req.json()
  if (_hp) return NextResponse.json({ ok: true })

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message trop long (2000 caractères max).' }, { status: 400 })
  }

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Concert introuvable.' }, { status: 404 })
  }

  const concert = await prisma.concert.findFirst({
    where: { id, isPublic: true, date: { gte: new Date() } },
    select: {
      name: true,
      date: true,
      startTime: true,
      location: true,
      address: true,
      postalCode: true,
      city: true,
      group: {
        select: {
          name: true,
          members: {
            where: { groupRole: 'CHEF' },
            select: { user: { select: { email: true } } },
          },
        },
      },
    },
  })

  if (!concert) {
    return NextResponse.json({ error: 'Concert introuvable.' }, { status: 404 })
  }

  const chefs = concert.group.members.map((m) => m.user.email).filter(Boolean)
  if (chefs.length === 0) return NextResponse.json({ ok: true })

  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message)
  const address = fullAddress(concert)

  await Promise.all(chefs.map((chefEmail) =>
    resend.emails.send({
      from: 'Sol au piano <noreply@solaupiano.fr>',
      to: chefEmail,
      replyTo: email,
      subject: `Question concert - ${concert.group.name} - ${concert.name}`,
      html: `
        <div style="font-family:-apple-system,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#f9fafb;">
          <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="font-size:20px;margin:0 0 8px;color:#111827;">Nouvelle question sur un concert</h1>
            <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Un visiteur vous contacte depuis la carte publique de Sol au piano.</p>

            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 4px;font-size:14px;color:#111827;"><strong>${escapeHtml(concert.group.name)}</strong> en concert ici</p>
              <p style="margin:0 0 4px;font-size:13px;color:#4b5563;">${escapeHtml(address)}</p>
              <p style="margin:0;font-size:13px;color:#7c2d12;">${escapeHtml(formatDate(concert.date))}${concert.startTime ? `, à partir de ${escapeHtml(concert.startTime)}` : ', heure à confirmer'}</p>
            </div>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 4px;font-size:13px;"><strong>Nom :</strong> ${safeName}</p>
              <p style="margin:0;font-size:13px;"><strong>Email :</strong> <a href="mailto:${safeEmail}" style="color:#4f46e5;">${safeEmail}</a></p>
            </div>

            <div style="background:#f0f4ff;border-left:4px solid #4f46e5;border-radius:4px;padding:16px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
            </div>

            <div style="margin:24px 0;text-align:center;">
              <a href="mailto:${safeEmail}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;">
                Répondre à ${safeName} →
              </a>
            </div>
          </div>
        </div>`,
    })
  ))

  return NextResponse.json({ ok: true })
}
