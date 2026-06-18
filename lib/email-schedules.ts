import { prisma } from './prisma'

// Planification configurable des mails « événementiels » (rappels liés à une
// répétition / un concert). L'admin règle : nombre de jours, avant/après,
// heure d'envoi, activé/désactivé. Stocké en siteSetting `email_sched_<key>`.

export type ScheduleDirection = 'BEFORE' | 'AFTER'

export interface EmailSchedule {
  enabled: boolean
  days: number
  direction: ScheduleDirection
  time: string // « HH:MM »
  // Optionnel : pour les rappels récurrents, intervalle de relance en jours
  // (ex. 2 = on relance tous les 2 jours tant que la condition tient).
  repeatDays?: number
}

export interface SchedulableEmailDef {
  key: string // = clé du template (pour le texte)
  name: string
  eventType: 'rehearsal' | 'concert'
  default: EmailSchedule
}

export const SCHEDULABLE_EMAILS: SchedulableEmailDef[] = [
  { key: 'rehearsal_auto_reminder',     name: 'Rappel de répétition',                eventType: 'rehearsal', default: { enabled: true, days: 5, direction: 'BEFORE', time: '08:00' } },
  { key: 'mastery_reminder',            name: 'Relance niveau de maîtrise',          eventType: 'rehearsal', default: { enabled: true, days: 1, direction: 'BEFORE', time: '18:00' } },
  { key: 'evaluation_reminder',         name: "Rappel d'évaluation",                 eventType: 'rehearsal', default: { enabled: true, days: 1, direction: 'AFTER',  time: '09:00' } },
  { key: 'concert_validation_reminder', name: 'Confirmation de présence (concert)',  eventType: 'concert',   default: { enabled: true, days: 3, direction: 'BEFORE', time: '08:00' } },
  { key: 'concert_time_reminder',       name: "Relance heure de concert manquante",  eventType: 'concert',   default: { enabled: true, days: 10, direction: 'BEFORE', time: '09:00', repeatDays: 2 } },
]

export function getScheduleDef(key: string): SchedulableEmailDef | undefined {
  return SCHEDULABLE_EMAILS.find((s) => s.key === key)
}

export function parseSchedule(value: string | null | undefined, fallback: EmailSchedule): EmailSchedule {
  if (!value) return fallback
  try {
    const o = JSON.parse(value)
    const rawRepeat = Number.isFinite(o.repeatDays) ? Math.max(1, Math.floor(Number(o.repeatDays))) : fallback.repeatDays
    return {
      enabled: typeof o.enabled === 'boolean' ? o.enabled : fallback.enabled,
      days: Number.isFinite(o.days) ? Math.max(0, Math.floor(Number(o.days))) : fallback.days,
      direction: o.direction === 'AFTER' ? 'AFTER' : 'BEFORE',
      time: typeof o.time === 'string' && /^\d{2}:\d{2}$/.test(o.time) ? o.time : fallback.time,
      // On ne conserve repeatDays que si le mail le supporte (présent dans le fallback).
      ...(fallback.repeatDays !== undefined ? { repeatDays: rawRepeat } : {}),
    }
  } catch {
    return fallback
  }
}

export async function getEmailSchedule(key: string): Promise<EmailSchedule | null> {
  const def = getScheduleDef(key)
  if (!def) return null
  const row = await prisma.siteSetting.findUnique({ where: { key: `email_sched_${key}` } })
  return parseSchedule(row?.value, def.default)
}

// Fenêtre d'événements à cibler (centrée sur N jours avant/après, ±12h).
// Tourne une fois par jour à l'heure planifiée → chaque événement tombe dans
// exactement une fenêtre.
export function computeEventWindow(now: Date, sched: EmailSchedule): { start: Date; end: Date } {
  const dayMs = 24 * 60 * 60 * 1000
  const sign = sched.direction === 'BEFORE' ? 1 : -1
  const center = now.getTime() + sign * sched.days * dayMs
  return { start: new Date(center - dayMs / 2), end: new Date(center + dayMs / 2) }
}

// L'heure courante (heure serveur) correspond-elle à l'heure planifiée ?
export function isScheduledHour(now: Date, sched: EmailSchedule): boolean {
  const h = Number(sched.time.split(':')[0])
  return now.getHours() === h
}
