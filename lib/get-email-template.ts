import { prisma } from './prisma'
import { getTemplateDef, substituteVars, textToHtml } from './email-templates'

interface ResolvedTemplate {
  subject: string
  introHtml: string
  outroHtml: string
  /** Substitue les vars dans subject+intro+outro et retourne le tout */
  render: (vars: Record<string, string>) => { subject: string; introHtml: string; outroHtml: string }
}

export async function getEmailTemplate(key: string): Promise<ResolvedTemplate> {
  const def = getTemplateDef(key)

  // Lire les overrides en DB
  const [subjectRow, introRow, outroRow] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: `email_tpl_${key}_subject` } }),
    prisma.siteSetting.findUnique({ where: { key: `email_tpl_${key}_intro` } }),
    prisma.siteSetting.findUnique({ where: { key: `email_tpl_${key}_outro` } }),
  ])

  const subject = subjectRow?.value ?? def?.defaultSubject ?? ''
  const intro   = introRow?.value   ?? def?.defaultIntro   ?? ''
  const outro   = outroRow?.value   ?? def?.defaultOutro   ?? ''

  return {
    subject,
    introHtml: textToHtml(intro),
    outroHtml: textToHtml(outro),
    render: (vars) => ({
      subject:   substituteVars(subject, vars),
      introHtml: textToHtml(substituteVars(intro, vars)),
      outroHtml: textToHtml(substituteVars(outro, vars)),
    }),
  }
}
