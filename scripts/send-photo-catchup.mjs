// Envoi ponctuel (rattrapage) de l'invitation "partagez vos photos" pour la
// répétition 7 (Toto's anthem) — le cron n'avait pas pu tourner ce matin.
import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'

// Charge les variables depuis .env
for (const line of readFileSync('/var/www/solaupiano/.env', 'utf8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const SITE = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
const resend = new Resend(process.env.RESEND_API_KEY)
const prisma = new PrismaClient()

function wrapper(body) {
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
      <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; background:#4f46e5; border-radius:14px; margin-bottom:12px;">
            <span style="font-size:24px;">🎹</span>
          </div>
          <h1 style="margin:0; font-size:22px; font-weight:700; color:#1e1b4b;">Sol au piano</h1>
          <p style="margin:4px 0 0; font-size:12px; color:#818cf8; font-style:italic;">du solo à l'orchestre</p>
        </div>
        ${body}
      </div>
      <p style="text-align:center; margin:16px auto 0; font-size:11px; color:#9ca3af; line-height:1.6;">
        Sol au piano — la plateforme des musiciens en groupe
      </p>
    </div>`
}
const ctaButton = (href, label) => `
  <div style="text-align:center; margin:24px 0 8px;">
    <a href="${href}" style="display:inline-block; background:#4f46e5; color:white; text-decoration:none; padding:12px 28px; border-radius:10px; font-size:14px; font-weight:600;">${label}</a>
  </div>`

async function main() {
  const r = await prisma.rehearsal.findUnique({
    where: { id: 7 },
    select: {
      groupId: true, date: true, startTime: true, location: true,
      group: { select: { name: true } },
      attendances: { where: { status: 'PRESENT' }, select: { user: { select: { name: true, email: true } } } },
    },
  })
  if (!r) { console.log('Répétition introuvable'); return }

  const dateStr = new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const galerieUrl = `${SITE}/groupes/${r.groupId}/galerie`
  const members = r.attendances.map((a) => a.user).filter((u) => u && u.email)

  console.log('Envoi à', members.length, 'membre(s):', members.map((m) => m.name).join(', '))

  for (const m of members) {
    const firstName = (m.name || '').split(' ')[0]
    const body = `
      <div style="display:inline-flex; align-items:center; gap:6px; background:#fae8ff; border:1px solid #f5d0fe; border-radius:8px; padding:6px 12px; margin-bottom:20px;">
        <span style="font-size:14px;">📸</span>
        <span style="font-size:12px; font-weight:600; color:#a21caf;">Galerie — partagez vos photos</span>
      </div>
      <p style="margin:0 0 14px; color:#374151; font-size:14px; line-height:1.6;">Bonjour ${firstName},</p>
      <p style="margin:0 0 14px; color:#374151; font-size:14px; line-height:1.6;">Votre répétition avec <strong>${r.group.name}</strong> vient d'avoir lieu 🎶</p>
      <p style="margin:0 0 14px; color:#374151; font-size:14px; line-height:1.6;">Pensez à partager vos meilleures photos dans la <strong>Galerie du groupe</strong> : c'est rapide depuis votre téléphone, et ça facilite la communication sur les réseaux sociaux du groupe.</p>
      <div style="background:#fdf4ff; border:1px solid #f5d0fe; border-radius:12px; padding:16px 20px; margin:20px 0;">
        <p style="margin:0 0 6px; font-size:15px; font-weight:700; color:#86198f; text-transform:capitalize;">${dateStr}</p>
        <p style="margin:0 0 4px; font-size:13px; color:#a21caf;">🕐 ${r.startTime}</p>
        ${r.location ? `<p style="margin:0; font-size:13px; color:#a21caf;">📍 ${r.location}</p>` : ''}
      </div>
      <p style="margin:0 0 14px; color:#6b7280; font-size:13px; line-height:1.6;">À l'avenir, vous recevrez automatiquement cette invitation 30 minutes avant chaque répétition. Merci et bravo pour cette première ! 🎸</p>
      ${ctaButton(galerieUrl, '📸 Ouvrir la Galerie du groupe')}`

    await resend.emails.send({
      from: 'Sol au piano <noreply@solaupiano.fr>',
      to: m.email,
      subject: `📸 Partagez vos photos — Répétition ${r.group.name}`,
      html: wrapper(body),
    })
    console.log('  ✓ envoyé à', m.name)
  }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
