import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTemplateDef } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

function isAdmin(session: any) { return session?.user?.siteRole === 'ADMIN' }

// PUT — sauvegarde les personnalisations d'un template
export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const def = getTemplateDef(params.key)
  if (!def) return NextResponse.json({ error: 'Template inconnu.' }, { status: 404 })

  const { subject, intro, outro } = await req.json()

  await Promise.all([
    prisma.siteSetting.upsert({
      where: { key: `email_tpl_${params.key}_subject` },
      create: { key: `email_tpl_${params.key}_subject`, value: subject ?? def.defaultSubject },
      update: { value: subject ?? def.defaultSubject },
    }),
    prisma.siteSetting.upsert({
      where: { key: `email_tpl_${params.key}_intro` },
      create: { key: `email_tpl_${params.key}_intro`, value: intro ?? def.defaultIntro },
      update: { value: intro ?? def.defaultIntro },
    }),
    prisma.siteSetting.upsert({
      where: { key: `email_tpl_${params.key}_outro` },
      create: { key: `email_tpl_${params.key}_outro`, value: outro ?? def.defaultOutro },
      update: { value: outro ?? def.defaultOutro },
    }),
  ])

  return NextResponse.json({ success: true })
}

// DELETE — remet le template à ses valeurs par défaut
export async function DELETE(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  await prisma.siteSetting.deleteMany({
    where: { key: { in: [
      `email_tpl_${params.key}_subject`,
      `email_tpl_${params.key}_intro`,
      `email_tpl_${params.key}_outro`,
    ]}},
  })

  return NextResponse.json({ success: true })
}
