import { prisma } from './prisma'
import type { ThemeId } from './themes'

export const SITE_ICONS = ['🎶', '🎵', '🎼', '🎸', '🎺', '🥁', '🎻', '🎷', '🎹', '🪗']

export interface ConcertPopupSettings {
  concertPopupKicker: string
  concertPopupTimePrefix: string
  concertPopupMissingTimeText: string
  concertPopupButtonLabel: string
  concertPopupBackgroundColor: string
  concertPopupTitleColor: string
  concertPopupTextColor: string
  concertPopupAccentColor: string
  concertPopupButtonBgColor: string
  concertPopupButtonTextColor: string
}

export interface SiteSettings extends ConcertPopupSettings {
  siteIcon: string
  colorTheme: ThemeId
}

export const DEFAULT_SETTINGS = {
  siteIcon: '🎶',
  colorTheme: 'indigo' as ThemeId,
  concertPopupKicker: 'en concert ici',
  concertPopupTimePrefix: 'à partir de',
  concertPopupMissingTimeText: 'Heure à confirmer, cliquez sur en savoir plus pour contacter le groupe',
  concertPopupButtonLabel: 'En savoir plus',
  concertPopupBackgroundColor: '#ffffff',
  concertPopupTitleColor: '#111827',
  concertPopupTextColor: '#6b7280',
  concertPopupAccentColor: '#7c3aed',
  concertPopupButtonBgColor: '#4f46e5',
  concertPopupButtonTextColor: '#ffffff',
} satisfies SiteSettings

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const rows = await prisma.siteSetting.findMany()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return {
      siteIcon: map.siteIcon ?? DEFAULT_SETTINGS.siteIcon,
      colorTheme: (map.colorTheme as ThemeId) ?? DEFAULT_SETTINGS.colorTheme,
      concertPopupKicker: map.concertPopupKicker ?? DEFAULT_SETTINGS.concertPopupKicker,
      concertPopupTimePrefix: map.concertPopupTimePrefix ?? DEFAULT_SETTINGS.concertPopupTimePrefix,
      concertPopupMissingTimeText: map.concertPopupMissingTimeText ?? DEFAULT_SETTINGS.concertPopupMissingTimeText,
      concertPopupButtonLabel: map.concertPopupButtonLabel ?? DEFAULT_SETTINGS.concertPopupButtonLabel,
      concertPopupBackgroundColor: map.concertPopupBackgroundColor ?? DEFAULT_SETTINGS.concertPopupBackgroundColor,
      concertPopupTitleColor: map.concertPopupTitleColor ?? DEFAULT_SETTINGS.concertPopupTitleColor,
      concertPopupTextColor: map.concertPopupTextColor ?? DEFAULT_SETTINGS.concertPopupTextColor,
      concertPopupAccentColor: map.concertPopupAccentColor ?? DEFAULT_SETTINGS.concertPopupAccentColor,
      concertPopupButtonBgColor: map.concertPopupButtonBgColor ?? DEFAULT_SETTINGS.concertPopupButtonBgColor,
      concertPopupButtonTextColor: map.concertPopupButtonTextColor ?? DEFAULT_SETTINGS.concertPopupButtonTextColor,
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
