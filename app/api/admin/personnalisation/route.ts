import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSiteSettings, updateSiteSettings } from '@/lib/site-settings'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.siteRole === 'ADMIN' ? session : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  return NextResponse.json(await getSiteSettings())
}

export async function PUT(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const body = await req.json()
  const allowedKeys = [
    'siteIcon',
    'colorTheme',
    'concertPopupKicker',
    'concertPopupDatePrefix',
    'concertPopupTimePrefix',
    'concertPopupMissingTimeText',
    'concertPopupButtonLabel',
    'concertPopupBackgroundColor',
    'concertPopupTitleColor',
    'concertPopupTextColor',
    'concertPopupDateColor',
    'concertPopupAccentColor',
    'concertPopupButtonBgColor',
    'concertPopupButtonTextColor',
  ] as const
  const updates = Object.fromEntries(
    allowedKeys
      .filter((key) => typeof body[key] === 'string')
      .map((key) => [key, body[key].trim()])
      .filter(([, value]) => value)
  )
  await updateSiteSettings(updates)
  return NextResponse.json(await getSiteSettings())
}
