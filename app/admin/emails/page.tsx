import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'
import { EmailsManager } from './EmailsManager'

export const dynamic = 'force-dynamic'

export default async function AdminEmailsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.siteRole !== 'ADMIN') redirect('/tableau-de-bord')

  // Charger les overrides DB
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

  const customizedCount = templates.filter(t => t.customized).length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Personnalisation des emails</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customizedCount > 0
              ? `${customizedCount} email${customizedCount > 1 ? 's' : ''} personnalisé${customizedCount > 1 ? 's' : ''} sur ${templates.length}`
              : `${templates.length} emails — tous sur les textes par défaut`}
          </p>
        </div>
      </div>
      <EmailsManager templates={templates} />
    </div>
  )
}
