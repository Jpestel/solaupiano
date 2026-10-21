import crypto from 'crypto'

/**
 * Accès sur invitation.
 *
 * L'inscription à Sol au piano n'est pas ouverte au public. Elle n'est possible
 * que dans deux cas :
 *  - la personne arrive par le lien d'invitation d'un groupe (`Group.inviteToken`),
 *    partagé par un chef d'orchestre ou un professeur ;
 *  - la personne a reçu une invitation personnelle de l'éditeur, matérialisée par
 *    le jeton signé ci-dessous.
 *
 * Le jeton est signé plutôt que stocké : pas de table à tenir, rien à purger, et
 * il devient caduc tout seul à sa date d'expiration. Il est lié à l'adresse email
 * invitée, pour qu'il ne puisse pas être transmis à quelqu'un d'autre.
 */

function secret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || 'solaupiano-acces-fallback'
}

/** Durée de validité d'une invitation personnelle. */
export const ACCESS_TOKEN_DAYS = 30

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url')
const unb64url = (s: string) => Buffer.from(s, 'base64url').toString('utf8')

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(`acces:${payload}`).digest('hex').slice(0, 40)
}

/** Jeton d'invitation personnelle : lie une adresse email à une date d'expiration. */
export function signAccessToken(email: string, days = ACCESS_TOKEN_DAYS): string {
  const expires = Date.now() + days * 24 * 60 * 60 * 1000
  const payload = b64url(`${email.trim().toLowerCase()}|${expires}`)
  return `${payload}.${sign(payload)}`
}

/** Renvoie l'email invité si le jeton est authentique et non expiré, sinon null. */
export function verifyAccessToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload)
  try {
    if (signature.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null
  } catch {
    return null
  }

  try {
    const [email, expires] = unb64url(payload).split('|')
    if (!email || !expires) return null
    if (Number(expires) < Date.now()) return null
    return email
  } catch {
    return null
  }
}

/** L'adresse saisie à l'inscription doit être celle qui a été invitée. */
export function accessTokenMatches(token: string, email: string): boolean {
  const invited = verifyAccessToken(token)
  return invited !== null && invited === email.trim().toLowerCase()
}
