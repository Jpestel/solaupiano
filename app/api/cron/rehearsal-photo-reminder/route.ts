import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendRehearsalPhotoReminder } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Décalage (minutes) entre Europe/Paris et UTC pour un instant donné (DST-aware).
function parisOffsetMinutes(at: Date): number {
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }))
  const paris = new Date(at.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  return Math.round((paris.getTime() - utc.getTime()) / 60000)
}

// Instant UTC correspondant à (jour de `date` UTC) + startTime "HH:MM" en heure de Paris.
function rehearsalStartUtc(date: Date, startTime: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim())
  if (!m) return null
  const y = date.getUTCFullYear(), mo = date.getUTCMonth(), d = date.getUTCDate()
  const hh = Number(m[1]), mm = Number(m[2])
  const provUtc = Date.UTC(y, mo, d, hh, mm)
  const off = parisOffsetMinutes(new Date(provUtc))
  return new Date(provUtc - off * 60000)
}

// Cron (toutes les ~5 min) : 30 min avant une répétition, invite les membres
// présents à partager leurs photos dans la Galerie à l'issue de la répétition.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000

  const rehearsals = await prisma.rehearsal.findMany({
    where: {
      photoReminderSentAt: null,
      date: { gte: new Date(now.getTime() - dayMs), lte: new Date(now.getTime() + dayMs) },
      group: { archivedAt: null },
    },
    select: {
      id: true, date: true, startTime: true, location: true, groupId: true,
      group: { select: { name: true, plan: true } },
      attendances: {
        where: { status: 'PRESENT' },
        select: { user: { select: { email: true, name: true } } },
      },
    },
  })

  // Plans avec Galerie activée (sinon, pas de mail)
  const planKeys = Array.from(new Set(rehearsals.map((r) => r.group.plan)))
  const plans = await prisma.plan.findMany({ where: { key: { in: planKeys } }, select: { key: true, hasGalerie: true } })
  const galerieOk = new Map(plans.map((p) => [p.key, p.hasGalerie]))

  let sent = 0, processed = 0

  for (const r of rehearsals) {
    const start = rehearsalStartUtc(r.date, r.startTime)
    if (!start) continue
    const minutesUntil = (start.getTime() - now.getTime()) / 60000
    // Fenêtre : de 30 min avant jusqu'à 15 min après le début (tolérance cron)
    if (minutesUntil > 33 || minutesUntil < -15) continue

    processed++
    // Marque comme traité immédiatement (évite les doublons entre exécutions)
    await prisma.rehearsal.update({ where: { id: r.id }, data: { photoReminderSentAt: now } })

    if (galerieOk.get(r.group.plan) === false) continue

    const members = r.attendances
      .map((a) => a.user)
      .filter((u): u is { email: string; name: string } => !!u?.email)
    if (members.length === 0) continue

    try {
      await sendRehearsalPhotoReminder(members, r.group.name, r.groupId, { date: r.date, startTime: r.startTime, location: r.location }, baseUrl)
      sent += members.length
    } catch (e) {
      console.error('rehearsal-photo-reminder send', r.id, e)
    }
  }

  return NextResponse.json({ ok: true, rehearsalsProcessed: processed, emailsSent: sent })
}
