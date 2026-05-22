import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { name, email, message, _hp } = await req.json()

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

  await Promise.all(chefs.map(chef =>
    resend.emails.send({
      from: 'Sol au piano <noreply@solaupiano.fr>',
      to: chef.email,
      replyTo: email,
      subject: `💬 Nouveau message de ${name} — ${groupName}`,
      html: `
        <div style="font-family:-apple-system,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;background:#f9fafb;">
          <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111;">Nouveau message</h2>
            <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">Via la page publique du groupe <strong>${groupName}</strong></p>

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 4px;font-size:13px;"><strong>Nom :</strong> ${name}</p>
              <p style="margin:0;font-size:13px;"><strong>Email :</strong> <a href="mailto:${email}" style="color:#4f46e5;">${email}</a></p>
            </div>

            <div style="background:#f0f4ff;border-left:4px solid #4f46e5;border-radius:4px;padding:16px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>

            <div style="margin-top:24px;text-align:center;">
              <a href="mailto:${email}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;">
                Répondre à ${name} →
              </a>
            </div>
          </div>
        </div>`,
    })
  ))

  return NextResponse.json({ ok: true })
}
