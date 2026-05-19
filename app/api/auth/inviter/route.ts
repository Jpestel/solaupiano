import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendInvitationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { email, message } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis.' }, { status: 400 })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://solaupiano.fr'

  await sendInvitationEmail(
    email,
    session.user.name ?? 'Un musicien',
    message?.trim() || null,
    `${baseUrl}/inscription`
  )

  return NextResponse.json({ ok: true })
}
