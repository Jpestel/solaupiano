import crypto from 'crypto'

// Secret de signature (réutilise les secrets déjà présents en prod)
function secret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || 'solaupiano-presence-fallback'
}

/** Jeton HMAC liant un utilisateur à une répétition (lien « je n'étais pas présent » depuis l'e-mail). */
export function signPresence(rehearsalId: number, userId: number): string {
  return crypto.createHmac('sha256', secret()).update(`presence:${rehearsalId}:${userId}`).digest('hex').slice(0, 40)
}

export function verifyPresence(rehearsalId: number, userId: number, token: string): boolean {
  const expected = signPresence(rehearsalId, userId)
  try {
    return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function signConcertPresence(concertId: number, userId: number): string {
  return crypto.createHmac('sha256', secret()).update(`presence:concert:${concertId}:${userId}`).digest('hex').slice(0, 40)
}

export function verifyConcertPresence(concertId: number, userId: number, token: string): boolean {
  const expected = signConcertPresence(concertId, userId)
  try {
    return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}
