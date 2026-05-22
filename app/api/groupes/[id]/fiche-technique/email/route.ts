import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function formatSection(title: string, rows: string[]): string {
  if (!rows.length) return ''
  return `
    <div style="margin-bottom:24px;">
      <h2 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e0e7ff;padding-bottom:6px;">${title}</h2>
      ${rows.map((r) => `<div style="font-size:13px;color:#374151;padding:3px 0;">${r}</div>`).join('')}
    </div>`
}

function buildEmailHtml(content: any, groupName: string, shareUrl?: string): string {
  const s = content.stage ?? {}
  const snd = content.sound ?? {}
  const lt = content.lights ?? {}
  const h = content.hospitality ?? {}

  const stageRows = [
    s.minWidth ? `📐 Scène min. : <strong>${s.minWidth} m (larg.) × ${s.minDepth || '?'} m (prof.)</strong>` : '',
    s.setupDuration ? `⏱ Montage : <strong>${s.setupDuration} min</strong>` : '',
    s.soundcheckDuration ? `🎚 Soundcheck : <strong>${s.soundcheckDuration} min</strong>` : '',
    s.powerNeeds ? `⚡ Électricité : ${s.powerNeeds}` : '',
    ...(s.members ?? []).map((m: any) =>
      `🎸 <strong>${m.name}</strong> — ${m.instrument || ''}${m.position ? ' · ' + m.position : ''}${m.backline ? ' · ' + m.backline : ''}`),
    s.notes ? `💬 ${s.notes}` : '',
  ].filter(Boolean)

  const channelRows = [
    snd.totalChannels ? `📻 Canaux : <strong>${snd.totalChannels}</strong>` : '',
    snd.monitorsCount ? `🔊 Retours scène : <strong>${snd.monitorsCount}</strong>` : '',
    snd.inEar ? `🎧 Mix in-ear : <strong>Oui</strong>` : '',
    snd.diCount ? `🔌 DI box : <strong>${snd.diCount}</strong>` : '',
    ...(snd.channels ?? []).map((ch: any, i: number) =>
      `${i + 1}. ${ch.source}${ch.type ? ' (' + ch.type + ')' : ''}${ch.notes ? ' — ' + ch.notes : ''}`),
    snd.notes ? `💬 ${snd.notes}` : '',
  ].filter(Boolean)

  const lightRows = [
    lt.hasFrontLight ? '✓ Éclairage façade' : '',
    lt.hasBackLight ? '✓ Contre-jour / backlight' : '',
    lt.hasFog ? '✓ Machine à fumée' : '',
    lt.hasStrobe ? '✓ Stroboscope' : '',
    lt.customRequests ? lt.customRequests : '',
    lt.notes ? `💬 ${lt.notes}` : '',
  ].filter(Boolean)

  const hospRows = [
    h.totalPersons ? `👥 Personnes : <strong>${h.totalPersons}</strong>` : '',
    h.meals ? `🍽 Repas : <strong>Oui</strong>${h.mealsDetails ? ' — ' + h.mealsDetails : ''}` : '',
    h.drinks ? `🥤 Rider boissons : ${h.drinks}` : '',
    h.accommodation ? `🏨 Hébergement : <strong>Oui</strong>${h.accommodationRooms ? ' — ' + h.accommodationRooms + ' chambre(s)' : ''}` : '',
    h.parkingSpots ? `🚐 Parking : ${h.parkingSpots}` : '',
    h.notes ? `💬 ${h.notes}` : '',
  ].filter(Boolean)

  return `
  <div style="font-family:-apple-system,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px;background:#f9fafb;">
    <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:#4f46e5;border-radius:14px;margin-bottom:10px;">
          <span style="font-size:22px;">🎹</span>
        </div>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#1e1b4b;">Sol au piano</h1>
      </div>

      <div style="background:#f0f4ff;border-radius:12px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #4f46e5;">
        <div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Fiche technique</div>
        <div style="font-size:20px;font-weight:800;color:#111;">${groupName}</div>
        ${content.genre ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;">${content.genre}</div>` : ''}
      </div>

      ${content.contactName || content.contactPhone || content.contactEmail ? `
      <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Contact</div>
        ${content.contactName ? `<div style="font-size:14px;font-weight:600;color:#111;">${content.contactName}</div>` : ''}
        ${content.contactPhone ? `<div style="font-size:13px;color:#4b5563;">📞 ${content.contactPhone}</div>` : ''}
        ${content.contactEmail ? `<div style="font-size:13px;color:#4b5563;">✉️ ${content.contactEmail}</div>` : ''}
      </div>` : ''}

      ${formatSection('🎸 Scène & Backline', stageRows)}
      ${formatSection('🔊 Son & Retours', channelRows)}
      ${formatSection('💡 Lumières', lightRows)}
      ${formatSection('🍺 Loges & Hospitalité', hospRows)}

      ${content.generalNotes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;"><div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:4px;">Notes générales</div><div style="font-size:13px;color:#78350f;">${content.generalNotes}</div></div>` : ''}

      ${shareUrl ? `
      <div style="margin-top:24px;text-align:center;">
        <a href="${shareUrl}" style="display:inline-block;background:#4f46e5;color:white;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;">
          Voir la fiche technique en ligne →
        </a>
      </div>` : ''}

      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">
        Envoyé via solaupiano.fr
      </div>
    </div>
  </div>`
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const userId = Number(session.user.id)
  const groupId = Number(params.id)
  const isAdmin = session.user.siteRole === 'ADMIN'

  const membership = isAdmin ? null : await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  })
  if (!isAdmin && membership?.groupRole !== 'CHEF') {
    return NextResponse.json({ error: 'Réservé au chef du groupe.' }, { status: 403 })
  }

  const { to, subject } = await req.json()
  if (!to) return NextResponse.json({ error: 'Email destinataire requis.' }, { status: 400 })

  const [group, rider] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.techRider.findUnique({ where: { groupId } }),
  ])

  if (!group) return NextResponse.json({ error: 'Groupe introuvable.' }, { status: 404 })
  if (!rider) return NextResponse.json({ error: 'Fiche technique non trouvée.' }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://solaupiano.fr'
  const shareUrl = rider.shareToken ? `${baseUrl}/fiche/${rider.shareToken}` : undefined

  const html = buildEmailHtml(rider.content, group.name, shareUrl)

  await resend.emails.send({
    from: 'Sol au piano <noreply@solaupiano.fr>',
    to,
    subject: subject || `Fiche technique — ${group.name}`,
    html,
  })

  return NextResponse.json({ ok: true })
}
