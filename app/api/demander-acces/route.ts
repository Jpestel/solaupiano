import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAccessRequest } from '@/lib/email'
import { signAccessToken, ACCESS_TOKEN_DAYS } from '@/lib/acces'

/**
 * Demande d'accès au site, qui est sur invitation.
 *
 * Route publique : on borne donc ce qu'elle accepte (longueurs, format) et on
 * ne révèle rien sur l'existence d'un compte. L'email envoyé à l'éditeur
 * contient déjà le lien d'invitation personnel, pour qu'accepter se résume à
 * répondre en le collant.
 */
/* Limite d'envois, en mémoire : la route est publique et chaque appel envoie un
   email à l'éditeur. Sans borne, n'importe qui pourrait inonder sa boîte. */
const FENETRE_MS = 60 * 60 * 1000
const MAX_PAR_IP = 5
const MAX_PAR_EMAIL = 2
const parIp = new Map<string, number[]>()
const parEmail = new Map<string, number[]>()

function depasse(table: Map<string, number[]>, cle: string, max: number): boolean {
  const now = Date.now()
  const recents = (table.get(cle) ?? []).filter((t) => now - t < FENETRE_MS)
  if (recents.length >= max) { table.set(cle, recents); return true }
  recents.push(now)
  table.set(cle, recents)
  return false
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'inconnue'
  if (depasse(parIp, ip, MAX_PAR_IP)) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez dans une heure.' }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const message = String(body.message ?? '').trim()

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Merci de remplir tous les champs.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Cette adresse email ne semble pas valide.' }, { status: 400 })
  }
  if (name.length > 120 || email.length > 160 || message.length > 2000) {
    return NextResponse.json({ error: 'Votre message est trop long.' }, { status: 400 })
  }

  if (depasse(parEmail, email, MAX_PAR_EMAIL)) {
    // Même réponse qu'un succès : on ne dit pas à un tiers que l'adresse a déjà servi.
    return NextResponse.json({ ok: true })
  }

  const admin = await prisma.user.findFirst({
    where: { siteRole: 'ADMIN' },
    select: { email: true },
  })
  if (!admin) {
    return NextResponse.json({ error: 'Impossible de transmettre la demande pour le moment.' }, { status: 500 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'
  const accessUrl = `${baseUrl}/inscription?acces=${encodeURIComponent(signAccessToken(email))}`

  const result = await sendAccessRequest(admin.email, { name, email, message }, accessUrl, ACCESS_TOKEN_DAYS)
  if (!result.ok) {
    return NextResponse.json({ error: "L'envoi a échoué. Réessayez dans un instant." }, { status: 502 })
  }

  // Réponse volontairement identique quelle que soit l'existence d'un compte.
  return NextResponse.json({ ok: true })
}
