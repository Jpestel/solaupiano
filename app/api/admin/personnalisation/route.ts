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
  const { siteIcon, colorTheme } = body
  await updateSiteSettings({ ...(siteIcon && { siteIcon }), ...(colorTheme && { colorTheme }) })
  return NextResponse.json(await getSiteSettings())
}
