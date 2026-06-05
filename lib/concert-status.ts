import { prisma } from '@/lib/prisma'

export function parseRequired(raw: string | null | undefined): number[] {
  if (!raw) return []
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.map(Number).filter(Number.isFinite) : [] } catch { return [] }
}

// Date limite de confirmation (deadline) = date du concert - confirmDaysBefore jours.
export function confirmDeadline(date: Date, confirmDaysBefore: number | null | undefined): Date {
  const d = new Date(date)
  if (confirmDaysBefore && confirmDaysBefore > 0) d.setDate(d.getDate() - confirmDaysBefore)
  return d
}

// Recalcule le statut d'un concert d'après les présences des membres obligatoires.
// CONFIRMED si tous les obligatoires sont PRESENT ; sinon PENDING. Ne touche jamais à CANCELLED.
export async function recomputeConcertStatus(concertId: number) {
  const c = await prisma.concert.findUnique({
    where: { id: concertId },
    select: { requiredUserIds: true, status: true },
  })
  if (!c || c.status === 'CANCELLED') return
  const required = parseRequired(c.requiredUserIds)
  if (required.length === 0) return // aucune contrainte → reste CONFIRMED

  const presentCount = await prisma.concertAttendance.count({
    where: { concertId, userId: { in: required }, status: 'PRESENT' },
  })
  const newStatus = presentCount >= required.length ? 'CONFIRMED' : 'PENDING'
  if (newStatus !== c.status) {
    await prisma.concert.update({ where: { id: concertId }, data: { status: newStatus } })
  }
}
