import { FlashInfoUnit } from '@prisma/client'

const H = 3600_000
const D = 24 * H
const W = 7 * D
const M = 30 * D

export function intervalToMs(value: number, unit: FlashInfoUnit): number {
  const base = unit === 'HOUR' ? H : unit === 'DAY' ? D : unit === 'WEEK' ? W : M
  return Math.max(1, value) * base
}

export const UNIT_LABEL: Record<FlashInfoUnit, string> = {
  HOUR: 'heure(s)',
  DAY: 'jour(s)',
  WEEK: 'semaine(s)',
  MONTH: 'mois',
}

export const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  INFO: { label: 'Info', icon: 'ℹ️', color: 'indigo' },
  ASTUCE: { label: 'Astuce', icon: '💡', color: 'amber' },
  NEWS: { label: 'News', icon: '📣', color: 'green' },
  ALERTE: { label: 'Alerte', icon: '⚠️', color: 'rose' },
}
