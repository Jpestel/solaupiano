import { prisma } from './prisma'
import { DEFAULT_SETTINGS, type SiteSettings } from './site-settings'

// Lecture et écriture des réglages du site dans la base — réservé au serveur.
// (Les types, constantes et fonctions pures restent dans site-settings.ts, lisible du navigateur.)

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await prisma.siteSetting.findMany()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      siteIcon: map.siteIcon ?? DEFAULT_SETTINGS.siteIcon,
      colorTheme: (map.colorTheme as ThemeId) ?? DEFAULT_SETTINGS.colorTheme,
      concertPopupKicker: map.concertPopupKicker ?? DEFAULT_SETTINGS.concertPopupKicker,
      concertPopupDatePrefix: map.concertPopupDatePrefix ?? DEFAULT_SETTINGS.concertPopupDatePrefix,
      concertPopupTimePrefix: map.concertPopupTimePrefix ?? DEFAULT_SETTINGS.concertPopupTimePrefix,
      concertPopupMissingTimeText: map.concertPopupMissingTimeText ?? DEFAULT_SETTINGS.concertPopupMissingTimeText,
      concertPopupButtonLabel: map.concertPopupButtonLabel ?? DEFAULT_SETTINGS.concertPopupButtonLabel,
      concertPopupBackgroundColor: map.concertPopupBackgroundColor ?? DEFAULT_SETTINGS.concertPopupBackgroundColor,
      concertPopupTitleColor: map.concertPopupTitleColor ?? DEFAULT_SETTINGS.concertPopupTitleColor,
      concertPopupTextColor: map.concertPopupTextColor ?? DEFAULT_SETTINGS.concertPopupTextColor,
      concertPopupDateColor: map.concertPopupDateColor ?? DEFAULT_SETTINGS.concertPopupDateColor,
      concertPopupAccentColor: map.concertPopupAccentColor ?? DEFAULT_SETTINGS.concertPopupAccentColor,
      concertPopupButtonBgColor: map.concertPopupButtonBgColor ?? DEFAULT_SETTINGS.concertPopupButtonBgColor,
      concertPopupButtonTextColor: map.concertPopupButtonTextColor ?? DEFAULT_SETTINGS.concertPopupButtonTextColor,
      concertPopupLines: map.concertPopupLines ?? DEFAULT_SETTINGS.concertPopupLines,
      groupCardLines: map.groupCardLines ?? DEFAULT_SETTINGS.groupCardLines,
      groupCardTitleColor: map.groupCardTitleColor ?? DEFAULT_SETTINGS.groupCardTitleColor,
      groupCardTextColor: map.groupCardTextColor ?? DEFAULT_SETTINGS.groupCardTextColor,
      groupCardAccentColor: map.groupCardAccentColor ?? DEFAULT_SETTINGS.groupCardAccentColor,
      groupCardPageLabel: map.groupCardPageLabel ?? DEFAULT_SETTINGS.groupCardPageLabel,
      groupCardContactLabel: map.groupCardContactLabel ?? DEFAULT_SETTINGS.groupCardContactLabel,
      groupCardSectionTitle: map.groupCardSectionTitle ?? DEFAULT_SETTINGS.groupCardSectionTitle,
      groupCardSeeAllLabel: map.groupCardSeeAllLabel ?? DEFAULT_SETTINGS.groupCardSeeAllLabel,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateSiteSettings(data: Partial<Record<keyof SiteSettings, string>>) {
  await Promise.all(
    Object.entries(data).filter(([, value]) => value !== undefined).map(([key, value]) =>
      prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  )
}
