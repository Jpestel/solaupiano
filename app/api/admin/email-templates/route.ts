import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) { return session?.user?.siteRole === 'ADMIN' }

// GET — retourne tous les templates avec leurs valeurs DB si personnalisées
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const settings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: 'email_tpl_' } },
  })
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))

  const templates = EMAIL_TEMPLATES.map(tpl => ({
    ...tpl,
    subject: settingsMap[`email_tpl_${tpl.key}_subject`] ?? tpl.defaultSubject,
    intro:   settingsMap[`email_tpl_${tpl.key}_intro`]   ?? tpl.defaultIntro,
    outro:   settingsMap[`email_tpl_${tpl.key}_outro`]   ?? tpl.defaultOutro,
    customized: !!(
      settingsMap[`email_tpl_${tpl.key}_subject`] ||
      settingsMap[`email_tpl_${tpl.key}_intro`]   ||
      settingsMap[`email_tpl_${tpl.key}_outro`]
    ),
  }))

  return NextResponse.json(templates)
}
